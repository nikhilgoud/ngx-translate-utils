import * as vscode from 'vscode';
import * as fs from 'fs';
import { getCurrentVscodeSettings, getI18nPath, getTranslationValue, tryParseJSON } from './utils';
/**
 * Sync lang files line by line to maintain easy navigation of keys
 */
export async function organizeLangFile(context: vscode.ExtensionContext) {
  const currentFileName = vscode.window.activeTextEditor.document.fileName;
  if (!currentFileName.endsWith('.json')) {
    vscode.window.showWarningMessage('Expected a JSON file.');
    return;
  }

  if (vscode.workspace.name === undefined) {
    vscode.window.showWarningMessage('This extension must be used in a workspace.');
    return;
  }

  try {
    const langDoc = vscode.window.activeTextEditor.document;
    if (getCurrentVscodeSettings().defaultLang === langDoc.fileName.split(/(\/|\\)/).pop()) {
      vscode.window.showWarningMessage('Select file other than default language file.');
      return;
    }
    const baseLangDocs = await vscode.workspace.findFiles(getI18nPath());
    const bdoc = await vscode.workspace.openTextDocument(baseLangDocs[0]);
    const ljson = JSON.parse(langDoc.getText());
    // const bjson = JSON.parse(bdoc.getText());
    let needChanges = false;
    let keyprefix = '',
      content = '{',
      i = 0,
      j = 0;
    let found = false,
      pfound = false;

    while (!needChanges && j < langDoc.lineCount) {
      const line = langDoc.lineAt(j).text;
      const bline = bdoc.lineAt(j).text;
      if (line.replace(/\s/g, '').endsWith(':{')) {
        const startingkey = line.split(':')[0].replace(/"/g, '').trim();
        keyprefix = keyprefix.length > 0 ? `${keyprefix}.${startingkey}` : startingkey;
      } else if (line.replace(/\s/g, '').endsWith('}')) {
        keyprefix = keyprefix.slice(0, keyprefix.lastIndexOf('.') - 1);
        pfound = !!getTranslationValue(ljson, keyprefix);
      } else if (`${keyprefix}.${langDoc.lineAt(j).text.split(':')[0].trim()}` !== `${keyprefix}.${bdoc.lineAt(j).text.split(':')[0].trim()}`) {
        needChanges = true;
      }
      j++;/*  */
    }

    if (!needChanges) {
      vscode.window.showInformationMessage('Language file already synced with base.');
      return true;
    }
    for (let i = 0; i < bdoc.lineCount; i++) {
      let line = bdoc.lineAt(i).text;
      const bkey = line.split(':')[0];
      const val = ljson[bkey.trim().replace(/"/g, '')];
      const langKey = langDoc.lineAt(j).text.split(':')[0].trim();

      if (line.replace(/\s/g, '').endsWith(':{')) {
        const startingkey = line.split(':')[0].replace(/"/g, '').trim();
        keyprefix = keyprefix.length > 0 ? `${keyprefix}.${startingkey}` : startingkey;
        if (!val) {
          pfound = false;
        } else {
          pfound = true;
        }
      } else if (line.replace(/\s/g, '').endsWith('}')) {
        keyprefix = keyprefix.slice(0, keyprefix.lastIndexOf('.') - 1);
        pfound = !!getTranslationValue(ljson, keyprefix);
      }
      let lt = line;
      if (line.trim().endsWith(',')) {
        lt = line.substring(0, line.length - 1);
      }
      const kv = tryParseJSON(`{${lt}}`);
      const fk = kv && (keyprefix ? `${keyprefix}.${Object.keys(kv).pop()}` : Object.keys(kv).pop());
      const lv = fk && getTranslationValue(ljson, fk);

      let appendLine = false;
      if ((pfound || !keyprefix) && lv && kv) {
        // translation found in lang file
        appendLine = true;
        if (typeof lv === 'string') {
          line = `${line.split(':')[0]}: "${lv.replace(/\n|\r|\r\n/g, '\\n').replace(/"/g, '\\"')}"`;
        }
      } else if (pfound && (line.replace(/\s/g, '').endsWith(':{') || line.replace(/\s/g, '').endsWith('}'))) {
        // terminal chars(open/closing obj field)
        appendLine = true;
      }

      if (appendLine) {
        content = `${content}${i == 1 || line.trim() === '}' || line.trim().endsWith('{') ? '' : ','}${i == 0 ? '' : '\r\n'}${line}`;
      }
    }
    content = `${content}\r\n}`;

    let prompt = false;
    if (needChanges && !getCurrentVscodeSettings().promptForOrganize && !context.workspaceState.get('organizeFileForMissingCheck')) {
      fs.writeFileSync(langDoc.uri.fsPath, content);
      context.workspaceState.update('organizeFileForMissingCheck', 'Done');
      return vscode.window.showInformationMessage('Language file synced with base.');
    } else if (
      (needChanges && context.workspaceState.get('organizeFileForMissingCheck')) ||
      !context.workspaceState.get('organizeFileForMissingCheck')
    ) {
      const target = await vscode.window.showQuickPick(
        [
          { label: 'Save', description: 'Save file with modified changes' },
          {
            label: 'Open Diff',
            description: 'Open diff window to manually save',
          },
        ],
        { placeHolder: 'Select the action sequience.' }
      );

      if (!target) {
        prompt = false;
        return false;
      } else {
        if (target.label === 'Save') {
          fs.writeFileSync(langDoc.uri.fsPath, content);
          vscode.window.showInformationMessage('Language file synced with base.');
          return true;
        } else {
          prompt = true;
        }
      }
    }
    if (prompt) {
      return vscode.workspace.openTextDocument({ content }).then(
        (doc) => {
          const fileName = langDoc.fileName.replace(vscode.workspace.rootPath, '').substring(1);
          return vscode.commands.executeCommand('vscode.diff', langDoc.uri, doc.uri, `Old ${fileName} ↔ Organized`).then(
            (ok) => {
              console.log('done');
            },
            (err) => {
              const errorMessage = 'Error opening diff editor.';
              vscode.window.showErrorMessage(errorMessage);
              console.error(errorMessage, err);
            }
          );
        },
        (err) => {
          const errorMessage = 'Error opening temporary file.';
          vscode.window.showErrorMessage(errorMessage);
          console.error(errorMessage, err);
        }
      );
    }
  } catch (err) {
    const errorMessage = 'Error while parsing the file: ' + currentFileName;
    vscode.window.showErrorMessage(errorMessage);
    console.error(errorMessage, err);
  }
}
