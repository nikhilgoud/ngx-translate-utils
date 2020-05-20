import * as vscode from "vscode";
import * as fs from "fs";

export interface ConfigurationSettings extends vscode.WorkspaceConfiguration {
  includeAll: boolean;
  defaultLang: string;
  autocapitalize: boolean;
  caseMode: string;
  replaceOnTranslate: boolean;
  translatePipeName: string;
  translatePlaceholder: string;
  quote: boolean;
  padding: boolean;
  langFileFolderPath: string;
}

/**
 * Returns the text value of a resource key at a given position in a given document. Returns null if none found.
 * @param position vscode Position
 * @param document vscode Document
 */
export function GetKeyAtPositionInDocument(position: vscode.Position, document: vscode.TextDocument) {
  let htmlRegex = new RegExp(
    /((\'|\")[^\`\~\!\@\#\%\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\<\>\/\?\s]+(\"|\')\s?\|\s?translate)/g
  );

  if (document.languageId === "typescript") {
    htmlRegex = null;
  }
  const wordRange = document.getWordRangeAtPosition(position, htmlRegex);
  if (document.languageId === "html" && !wordRange) {
    // Return null because the item is not a resource key.
    return null;
  }
  if (document.languageId === "typescript") {
    const ltext = document.lineAt(position.line).text.substr(0, position.character);
    const ii = ltext.lastIndexOf(".instant(");
    const gi = ltext.lastIndexOf(".get(");
    const vi = ltext.lastIndexOf("getI18nValue(");

    if (!(ii > -1 || gi > -1 || vi > -1)) {
      return null;
    }
    // const ni = [ii, gi, vi].reduce((p, c) => (Math.abs(c - position.character) < Math.abs(p - position.character) ? c : p));
    let nstart = new vscode.Position(position.line, ltext.lastIndexOf("'") + 1);
    let nend = new vscode.Position(
      position.line,
      position.character + document.lineAt(position.line).text.substring(position.character).indexOf("'")
    );
    let newRange = new vscode.Range(nstart, nend);
    return { clickedKey: document.getText(newRange), range: newRange };
  }
  return {
    clickedKey: document
      .getText(wordRange)
      .replace(/(\'|\"|\s)/g, "")
      .replace("|translate", ""),
    range: wordRange,
  };
}

/**
 * Returns a promise for an array of objects found for a given key. Searches through .json files in src/assets.
 * @param key String value for the key to find. Ex: "resource.login.title".
 */
export function FindObjectsForKeyInResourceFiles(key: string, isKey = true) {
  return vscode.workspace
    .findFiles(getI18nPath(), "**​/node_modules/**")
    .then((resourceFiles) => {
      return resourceFiles.map((file) => {
        return vscode.workspace.openTextDocument(vscode.Uri.file(file.fsPath)).then((document) => {
          const { lineNumber, value, field } = getLineNumberForKeyValueInDocument(key, document, isKey);
          return {
            path: file.fsPath,
            uri: document.uri,
            match: !!value,
            lineNumber: lineNumber,
            value: value,
            key: field,
          };
        });
      });
    })
    .then((mappedResourceFiles) => {
      return Promise.all(mappedResourceFiles).then((fileObjects) => {
        return fileObjects.filter((object) => getCurrentVscodeSettings().includeAll || object.match);
      });
    });
}

/**
 * Returns all the available translation languages
 */
export function GetAllLanguageFiles() {
  return vscode.workspace
    .findFiles(getCurrentVscodeSettings().langFileFolderPath + "**/*.json", "**​/node_modules/**")
    .then((resourceFiles) => {
      return resourceFiles.map((rfile) => {
        return {
          fileName: rfile.fsPath.split(/(\/|\\)/).pop(),
          path: rfile.fsPath,
        };
      });
    });
}

/**
 * Get the key,value & line number of a key in a given document (.json file).
 * Returns key,value & line number, or null if no match.
 *
 * @param key String value for the key to check. Ex: "resource.login.title".
 * @param document The document as vscode.TextDocument.
 */
function getLineNumberForKeyValueInDocument(search: string, document: vscode.TextDocument, isKey = true) {
  let keyprefix;
  for (let i = 0; i < document.lineCount; i++) {
    let line = document.lineAt(i);
    if (line.text.trim().endsWith(",")) {
      const lt = line.text.substring(0, line.text.length - 1);
      const kv = JSON.parse(`{${lt}}`);
      // const matches = key.split(".").reduce((o,k) => (typeof o == "undefined" || o === null) ? o : o[k], kv);
      if ((isKey && search.endsWith(Object.keys(kv).pop())) || (!isKey && kv[Object.keys(kv).pop()] === search)) {
        return {
          lineNumber: line.lineNumber,
          field: keyprefix ? `${keyprefix}.${Object.keys(kv).pop()}` : Object.keys(kv).pop(),
          value: kv[Object.keys(kv).pop()],
        };
      }
    } else if (line.text.replace(/\s/g, "").endsWith(":{")) {
      const startingkey = line.text.split(":")[0].replace(/"/g, "").trim();
      keyprefix = keyprefix ? `${keyprefix}.${startingkey}` : startingkey;
    }
  }
}

/**
 * Returns Unused translation keys for the selected
 */
export function zombieCheck() {
  const currentFileName = vscode.window.activeTextEditor.document.fileName;
  if (!currentFileName.endsWith(".json")) {
    vscode.window.showWarningMessage("Expected a JSON file.");
    return;
  }

  if (vscode.workspace.name === undefined) {
    vscode.window.showWarningMessage("This extension must be used in a workspace.");
    return;
  }

  try {
    const langDoc = vscode.window.activeTextEditor.document;
    const text = langDoc.getText();
    const json = JSON.parse(text.replace(/\r\n/g, "").replace(/\n/g, ""));
    const keys = getTranslationKeys(json, null, []);
    vscode.workspace.findFiles("**/*.{ts,js,html}", "**/node_modules/**").then((files) => {
      let zombies = [...keys];
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        zombies = findInFile(file, zombies);
      }

      let unzombified = { ...json };
      for (let index = 0; index < zombies.length; index++) {
        const zombie = zombies[index];
        const zombieKeys = zombie.split(".");
        const prop = zombieKeys.pop();
        const parent = zombieKeys.reduce((obj, key) => obj && obj[key], unzombified);
        if (parent && prop) {
          delete parent[prop];
        }
      }
      const content = JSON.stringify(unzombified, null, 2);
      vscode.workspace.openTextDocument({ content }).then(
        (doc) => {
          const fileName = langDoc.fileName.replace(vscode.workspace.rootPath, "").substring(1);
          return vscode.commands.executeCommand("vscode.diff", langDoc.uri, doc.uri, `${fileName} ↔ unzombified`).then(
            (ok) => {
              console.log("done");
            },
            (err) => {
              const errorMessage = "Error opening diff editor.";
              vscode.window.showErrorMessage(errorMessage);
              console.error(errorMessage, err);
            }
          );
        },
        (err) => {
          const errorMessage = "Error opening temporary file.";
          vscode.window.showErrorMessage(errorMessage);
          console.error(errorMessage, err);
        }
      );
    });
  } catch (err) {
    const errorMessage = "Error while parsing the file: " + currentFileName;
    vscode.window.showErrorMessage(errorMessage);
    console.error(errorMessage, err);
  }
}

function findInFile(uri: vscode.Uri, keys: string[]): string[] {
  const zombies = [...keys];
  try {
    const data = fs.readFileSync(uri.fsPath);
    for (const key of keys) {
      const found = data.indexOf(key) !== -1;
      const zombieIndex = zombies.indexOf(key);
      const alreadyZombie = zombieIndex !== -1;
      if (!found && !alreadyZombie) {
        zombies.push(key);
      }
      if (found && alreadyZombie) {
        zombies.splice(zombieIndex, 1);
      }
    }
  } catch (err) {
    console.error("error while reading file: " + uri.fsPath, err);
  }
  return zombies;
}

export function getTranslationKeys(obj: Object, cat: string, tKeys: string[]): string[] {
  const currentKeys = [...tKeys];
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (typeof value === "object") {
      currentKeys.push(...getTranslationKeys(value, cat === null ? key : cat.concat(".", key), tKeys));
    } else {
      currentKeys.push(cat === null ? key : cat.concat(".", key));
    }
  }
  return currentKeys;
}

export function getTranslationKeyFromString(input: string, caseMode: string = "snake", autocapitalize: boolean = true) {
  if (caseMode === "camel") {
    return camelize(input);
  } else if (caseMode === "snake") {
    if (autocapitalize) {
      return input.toUpperCase().replace(/ /g, "_");
    } else {
      return input.replace(/ /g, "_");
    }
  }
}

export function camelize(str: string) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (letter, index) {
      return index === 0 ? letter.toLowerCase() : letter.toUpperCase();
    })
    .replace(/\s+/g, "");
}

export function getCurrentVscodeSettings(): ConfigurationSettings {
  return vscode.workspace.getConfiguration("ngx-translate-utils") as ConfigurationSettings;
}

export function getI18nPath() {
  const settings = getCurrentVscodeSettings();
  return settings.langFileFolderPath + (settings.includeAll ? "**/*" : settings.defaultLang) + ".json";
}