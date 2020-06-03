import * as vscode from "vscode";
import { getTranslationKeys, getI18nPath, getCurrentVscodeSettings } from "./utils";
import { organizeLangFile } from "./sp";
/**
 * Returns Unused translation keys for the selected
 */
export async function missingCheck(context: vscode.ExtensionContext) {
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
    if (getCurrentVscodeSettings().defaultLang === langDoc.fileName.split(/(\/|\\)/).pop()) {
      vscode.window.showWarningMessage("Select file other than default language file.");
      return;
    }
    const baseLangDocs = await vscode.workspace.findFiles(getI18nPath());
    const bdoc = await vscode.workspace.openTextDocument(baseLangDocs[0]);
    const text = langDoc.getText();
    const json = JSON.parse(text.replace(/\r\n/g, ""));
    const basejson = JSON.parse(bdoc.getText());
    const keys = getTranslationKeys(json, null, []);
    const baseKeys = getTranslationKeys(basejson, null, []);

    const allMissingKeys = baseKeys.filter((b) => keys.indexOf(b) === -1);
    // vscode.workspace.findFiles("**/*.{ts,js,html}", "**/node_modules/**").then((files) => {
    //   let zombies = [...keys];
    //   for (let index = 0; index < files.length; index++) {
    //     const file = files[index];
    //     zombies = updateUnUsedTranslationsInFile(file, zombies);
    //   }
    // for (let i = 0; i < bdoc.lineCount; i++) {
    //   let line = bdoc.lineAt(i).text;
    //   if (line.replace(/\s/g, "").endsWith(":{")) {
    //     const startingkey = line.split(":")[0].replace(/"/g, "").trim();
    //     keyprefix = keyprefix.length > 0 ? `${keyprefix}.${startingkey}` : startingkey;
    //   } else if (line.replace(/\s/g, "").endsWith("}")) {
    //     keyprefix = keyprefix.slice(0, keyprefix.lastIndexOf("."));
    //   } else if (!line.replace(/\s/g, "").endsWith("{")) {
    //     let lt = line;
    //     if (line.trim().endsWith(",")) {
    //       lt = line.substring(0, line.length - 1);
    //     }
    //     const kv = JSON.parse(`{${lt}}`);
    //     const fk = keyprefix ? `${keyprefix}.${Object.keys(kv).pop()}` : Object.keys(kv).pop();
    //     if (allMissingKeys.indexOf(fk) !== -1) {
    //       line = `${line.split(":")[0]}: ${getTranslationValue(json, fk)
    //         .replace(/\n|\r|\r\n/g, "\\n")
    //         .replace(/"/g, '\\"')}`;
    //     }
    //   }
    //   content = `${content}${vscode.EndOfLine.CRLF}${line}`;
    // }

    // Organize check
    await context.workspaceState.update('organizeFileForMissingCheck',true);
    const isOrganised = await organizeLangFile(context);
    let keyprefix = "",
      content = "",
      i = 0,
      j = 0;
    while (i < bdoc.lineCount && j < vscode.window.activeTextEditor.document.lineCount) {
      let bline = bdoc.lineAt(i).text;
      let line = vscode.window.activeTextEditor.document.lineAt(j).text;

      const bkey = bline.split(":")[0];
      if (!line.startsWith(bkey)) {
        line = bline;
        i++;
      } else {
        i++;
        j++;
      }
      content = `${content}${(i == 1 ? "" : "\r\n")}${line}`;
    }

    vscode.workspace.openTextDocument({ content }).then(
      (doc) => {
        const fileName = langDoc.fileName.replace(vscode.workspace.rootPath, "").substring(1);
        return vscode.commands
          .executeCommand("vscode.diff", langDoc.uri, doc.uri, `${fileName} ↔ (${allMissingKeys.length}) missing`)
          .then(
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
    // });
  } catch (err) {
    const errorMessage = "Error while parsing the file: " + currentFileName;
    vscode.window.showErrorMessage(errorMessage);
    console.error(errorMessage, err);
  }
}
