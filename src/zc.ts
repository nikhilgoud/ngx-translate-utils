import * as vscode from 'vscode';
import { getTranslationKeys, updateUnUsedTranslationsInFile } from './utils';

/**
 * Returns Unused translation keys for the selected
 */
export function zombieCheck(context: vscode.ExtensionContext) {
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
    const text = langDoc.getText();
    const json = JSON.parse(text.replace(/\r\n/g, '').replace(/\n/g, ''));
    const keys = getTranslationKeys(json, null, []);
    vscode.workspace
      .findFiles(
        '**/*.{ts,js,html,json}',
        '{**/node_modules/**,**/src/assets/**,**/.vscode/**,**/e2e/**,package.json,package-lock.json,tslint.json,tsconfig.spec.json,angular.json,tsconfig.app.json,tsconfig.json}'
      )
      .then((files) => {
        let zombies = [...keys];
        for (let index = 0; index < files.length; index++) {
          const file = files[index];
          zombies = updateUnUsedTranslationsInFile(file, zombies);
        }

        const unzombified = { ...json };
        for (let index = 0; index < zombies.length; index++) {
          const zombie = zombies[index];
          const zombieKeys = zombie.split('.');
          const prop = zombieKeys.pop();
          const parent = zombieKeys.reduce((obj, key) => obj && obj[key], unzombified);
          if (parent && prop) {
            delete parent[prop];
          }
        }
        const content = JSON.stringify(unzombified, null, 2);
        vscode.workspace.openTextDocument({ content }).then(
          (doc) => {
            const fileName = langDoc.fileName.replace(vscode.workspace.rootPath || '', '').substring(1);
            return vscode.commands.executeCommand('vscode.diff', langDoc.uri, doc.uri, `${fileName} ↔ unzombified`).then(
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
      });
  } catch (err) {
    const errorMessage = 'Error while parsing the file: ' + currentFileName;
    vscode.window.showErrorMessage(errorMessage);
    console.error(errorMessage, err);
  }
}
