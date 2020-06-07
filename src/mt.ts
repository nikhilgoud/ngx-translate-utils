import * as vscode from 'vscode';
import { getI18nPath, getCurrentVscodeSettings, getTranslationKeysInOrder } from './utils';
import { organizeLangFile } from './sp';
/**
 * Returns Unused translation keys for the selected
 */
export async function missingCheck(context: vscode.ExtensionContext) {
  const currentFileName = vscode.window.activeTextEditor!.document.fileName;
  if (!currentFileName.endsWith('.json')) {
    vscode.window.showWarningMessage('Expected a JSON file.');
    return;
  }

  if (vscode.workspace.name === undefined) {
    vscode.window.showWarningMessage('This extension must be used in a workspace.');
    return;
  }

  try {
    const langDoc = vscode.window.activeTextEditor!.document;
    if (
      getCurrentVscodeSettings().defaultLang ===
      langDoc.fileName
        .split(/(\/|\\)/)
        .pop()
        ?.replace('.json', '')
    ) {
      vscode.window.showWarningMessage('Select file other than default language file.');
      return;
    }
    const baseLangDocs = await vscode.workspace.findFiles(getI18nPath());
    const bdoc = await vscode.workspace.openTextDocument(baseLangDocs[0]);
    const keys = getTranslationKeysInOrder(langDoc);
    const baseKeys = getTranslationKeysInOrder(bdoc);

    const allMissingKeys = baseKeys.filter((b) => keys.indexOf(b) === -1);
    let organised = false;
    let i = 0,
      j = 0;
    while (i < keys.length && j < baseKeys.length) {
      if (keys[i] === baseKeys[j]) {
        i++;
        j++;
      } else {
        j++;
      }
    }
    if (i === keys.length) {
      organised = true;
    }
    // Organize check
    if (!organised) {
      await context.workspaceState.update('organizeFileForMissingCheck', true);

      const target = await vscode.window.showQuickPick(
        [
          { label: 'Organize with Base', description: 'Organize translations in this file with base language file' },
          { label: 'Cancel', description: '' },
        ],
        { placeHolder: `File s not organized, select yes to organise. Total missing translations ${allMissingKeys.length}.` }
      );

      if (!target || target.label === 'Cancel') {
        vscode.window.showErrorMessage(
          `Total missing translations ${allMissingKeys.length}. Lang file not properly organized with base to display diff window.`
        );
        return false;
      } else {
        return organizeLangFile(context);
      }
    }
    let content = '';
    i = 0;
    j = 0;
    while (i < bdoc.lineCount && j < vscode.window.activeTextEditor!.document.lineCount) {
      const bline = bdoc.lineAt(i).text;
      let line = vscode.window.activeTextEditor!.document.lineAt(j).text;

      const bkey = bline.split(':')[0];
      if (!line.startsWith(bkey)) {
        line = bline;
        i++;
      } else {
        i++;
        j++;
      }
      content = `${content}${i == 1 ? '' : '\r\n'}${line}`;
    }

    vscode.workspace.openTextDocument({ content }).then(
      (doc) => {
        const fileName = langDoc.fileName.replace(vscode.workspace.rootPath || '', '').substring(1);
        return vscode.commands.executeCommand('vscode.diff', langDoc.uri, doc.uri, `${fileName} ↔ (${allMissingKeys.length}) missing`).then(
          (ok) => null,
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
    // });
  } catch (err) {
    const errorMessage = 'Error while checking missing kesy in: ' + currentFileName;
    vscode.window.showErrorMessage(errorMessage);
    console.error(errorMessage, err);
  }
}
