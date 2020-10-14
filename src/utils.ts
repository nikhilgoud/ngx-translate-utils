import * as vscode from 'vscode';
import * as fs from 'fs';

export interface ConfigurationSettings extends vscode.WorkspaceConfiguration {
  includeAll: boolean;
  defaultLang: string;
  autocapitalize: boolean;
  caseMode: string;
  replaceOnTranslate: boolean;
  translatePipeName: string;
  translatePlaceholder: string;
  translateJSONPlaceholder: string;
  quote: boolean;
  padding: boolean;
  langFileFolderPath: string;
  promptForOrganize: boolean;
  ignorePatternForGenerate: string;
}

/**
 * Returns the text value of a resource key at a given position in a given document. Returns null if none found.
 * @param position vscode Position
 * @param document vscode Document
 */
export function GetKeyAtPositionInDocument(position: vscode.Position, document: vscode.TextDocument) {
  let htmlRegex: any = new RegExp(/(('|")[^`~!@#%^&*()=+[{\]}\\|;:'",<>/?\s]+("|')\s?\|\s?translate)/g);

  if (document.languageId === 'typescript') {
    htmlRegex = undefined;
  }
  const wordRange = document.getWordRangeAtPosition(position, htmlRegex);
  if (document.languageId === 'html' && !wordRange) {
    // Return null because the item is not a resource key.
    return { clickedKey: '', range: undefined };
  }
  if (document.languageId === 'typescript') {
    const ltext = document.lineAt(position.line).text.substr(0, position.character);
    const ii = ltext.lastIndexOf('.instant(');
    const gi = ltext.lastIndexOf('.get(');
    const vi = ltext.lastIndexOf('getI18nValue(');
    const mi = ltext.lastIndexOf('marker(');

    if (!(ii > -1 || gi > -1 || vi > -1 || mi > -1)) {
      return { clickedKey: '', range: undefined };
    }
    // const ni = [ii, gi, vi].reduce((p, c) => (Math.abs(c - position.character) < Math.abs(p - position.character) ? c : p));
    const nstart = new vscode.Position(position.line, ltext.lastIndexOf("'") + 1);
    const nend = new vscode.Position(
      position.line,
      position.character + document.lineAt(position.line).text.substring(position.character).indexOf("'")
    );
    const newRange = new vscode.Range(nstart, nend);
    return { clickedKey: document.getText(newRange), range: newRange };
  } else if (document.languageId === 'html' && wordRange) {
    const newRange = new vscode.Range(
      new vscode.Position(wordRange.start.line, wordRange.start.character + 1),
      new vscode.Position(
        wordRange.end.line,
        wordRange.start.character +
          document.lineAt(wordRange.end.line).text.substring(wordRange.start.character, wordRange.end.character).lastIndexOf("'")
      )
    );

    return {
      clickedKey: document
        .getText(wordRange)
        .replace(/('|"|\s)/g, '')
        .replace('|translate', ''),
      range: newRange,
    };
  }
  return { clickedKey: document.getText(document.getWordRangeAtPosition(position)), range: document.getWordRangeAtPosition(position) };
}

/**
 * Returns a promise for an array of objects found for a given key. Searches through .json files in src/assets.
 * @param key String value for the key to find. Ex: "resource.login.title".
 */
export function FindObjectsForKeyInResourceFiles(key: string, isKey = true, isDp = false) {
  return vscode.workspace
    .findFiles(getI18nPath(), '**​/node_modules/**')
    .then((resourceFiles) => {
      return resourceFiles.map((file) => {
        return vscode.workspace.openTextDocument(vscode.Uri.file(file.fsPath)).then((document) => {
          const { lineNumber, value, field } = getLineNumberForKeyValueInDocument(key, document, isKey);
          return {
            path: file.fsPath,
            fileName: file.fsPath.split(/(\/|\\)/).pop(),
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
        return fileObjects.filter((object) => !isDp || getCurrentVscodeSettings().includeAll || object.match);
      });
    });
}

/**
 * Returns all the available translation languages
 */
export function GetAllLanguageFiles() {
  return vscode.workspace.findFiles(getCurrentVscodeSettings().langFileFolderPath + '**/*.json', '**​/node_modules/**').then((resourceFiles) => {
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
  let keyprefix = '';
  const ignorePattern = new RegExp(getCurrentVscodeSettings().ignorePatternForGenerate, 'g');
  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i);

    if (line.text.trim().endsWith('",') || line.text.trim().endsWith('"')) {
      const lt = line.text.trim().endsWith(',') ? line.text.substring(0, line.text.length - 1) : line.text;
      const kv: { [key: string]: string } = tryParseJSON(`{${lt}}`);
      // const matches = key.split(".").reduce((o,k) => (typeof o == "undefined" || o === null) ? o : o[k], kv);
      if (
        (isKey && getTranslationValue(kv, keyprefix.length > 0 ? search.slice(keyprefix.length + 1) : search)) ||
        (!isKey && Object.entries(kv)[0][1].replace(ignorePattern, '').toLowerCase() === search.replace(ignorePattern, '').toLowerCase())
      ) {
        return {
          lineNumber: line.lineNumber,
          field: keyprefix ? `${keyprefix}.${Object.keys(kv).pop()}` : Object.keys(kv).pop(),
          value: Object.entries(kv)[0][1],
        };
      }
    } else if (line.text.replace(/\s/g, '').endsWith(':{')) {
      const startingkey = line.text.split(':')[0].replace(/"/g, '').trim();
      keyprefix = keyprefix.length > 0 ? `${keyprefix}.${startingkey}` : startingkey;
    } else if (line.text.replace(/\s/g, '').endsWith('}') || line.text.replace(/\s/g, '').endsWith('},')) {
      keyprefix = keyprefix.slice(0, keyprefix.lastIndexOf('.') > -1 ? keyprefix.lastIndexOf('.') : 0);
    }
  }
  return { lineNumber: 0, field: '', value: '' };
}

export function updateUnUsedTranslationsInFile(uri: vscode.Uri, keys: string[]): string[] {
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
    console.error('error while reading file: ' + uri.fsPath, err);
  }
  return zombies;
}

export function getTranslationKeys(obj: any, cat: string | null | undefined, tKeys: string[]): string[] {
  const currentKeys = [...tKeys];
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (typeof value === 'object') {
      currentKeys.push(...getTranslationKeys(value, cat === null ? key : cat!.concat('.', key), tKeys));
    } else {
      currentKeys.push(cat === null ? key : cat!.concat('.', key));
    }
  }
  return currentKeys;
}

export function getTranslationKeysInOrder(doc: vscode.TextDocument): { Keys: string[]; Values: string[] } {
  let keyprefix = '';
  const currentKeys = [];
  const vals: string[] = [];
  for (let i = 0; i < doc.lineCount; i++) {
    let line = doc.lineAt(i).text;
    // const bline = bdoc.lineAt(j).text;
    if (line.replace(/\s/g, '').endsWith(':{')) {
      const startingkey = line.split(':')[0].replace(/"/g, '').trim();
      keyprefix = keyprefix.length > 0 ? `${keyprefix}.${startingkey}` : startingkey;
    } else if (line.replace(/\s/g, '').endsWith('}') || line.replace(/\s/g, '').endsWith('},')) {
      keyprefix = keyprefix.slice(0, keyprefix.lastIndexOf('.') > -1 ? keyprefix.lastIndexOf('.') : 0);
    }

    if (line.trim().endsWith(',')) {
      line = line.substring(0, line.length - 1);
    }
    const kv: { [key: string]: string } = line.trim() !== '' && tryParseJSON(`{${line}}`);
    if (kv) {
      currentKeys.push(keyprefix ? `${keyprefix}.${Object.entries(kv)[0][0]}` : Object.entries(kv)[0][0]);
      vals.push(Object.entries(kv)[0][1]);
    }
  }
  return { Keys: currentKeys, Values: vals };
}

export function getTranslationKeyFromString(input: string, caseMode = 'snake', autocapitalize = true) {
  if (caseMode === 'camel') {
    return camelize(input);
  } else if (caseMode === 'snake') {
    if (autocapitalize) {
      return input.toUpperCase().replace(/ /g, '_');
    } else {
      return input.replace(/ /g, '_');
    }
  }
}

export function camelize(str: string) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (letter, index) {
      return index === 0 ? letter.toLowerCase() : letter.toUpperCase();
    })
    .replace(/\s+/g, '');
}

export function getCurrentVscodeSettings(): ConfigurationSettings {
  return vscode.workspace.getConfiguration('ngx-translate-utils') as ConfigurationSettings;
}

export function getI18nPath() {
  const settings = getCurrentVscodeSettings();
  return settings.langFileFolderPath + (settings.includeAll ? '**/*' : settings.defaultLang) + '.json';
}

export function getTranslationValue(target: any, key: string): string {
  const keys = typeof key === 'string' ? key.split('.') : [key];
  key = '';
  do {
    key += keys.shift();
    if (!!target && !!target[key] && (typeof target[key] === 'object' || !keys.length)) {
      target = target[key];
      key = '';
    } else if (!keys.length) {
      target = undefined;
    } else {
      key += '.';
    }
  } while (keys.length);

  return target;
}

export function tryParseJSON(jsonString: string) {
  try {
    const o = JSON.parse(jsonString);

    // Handle non-exception-throwing cases:
    // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
    // but... JSON.parse(null) returns null, and typeof null === "object",
    // so we must check for that, too. Thankfully, null is falsey, so this suffices:
    if (o && typeof o === 'object') {
      return o;
    }
  } catch (e) {
    return false;
  }

  return false;
}
