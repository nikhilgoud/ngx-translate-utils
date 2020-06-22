import * as vscode from 'vscode';
import { CancellationToken, CompletionItem, CompletionItemProvider, CompletionList, Position, ProviderResult, TextDocument } from 'vscode';
import { getI18nPath, GetKeyAtPositionInDocument, getTranslationKeysInOrder } from './utils';

export class ResourceCompletionProvider implements CompletionItemProvider {
  provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<CompletionList> {
    const { clickedKey, range } = GetKeyAtPositionInDocument(position, document);

    if (!clickedKey) {
      return;
    }
    const completionItems = new Array<CompletionItem>();
    return vscode.workspace
      .findFiles(getI18nPath(), '**​/node_modules/**')
      .then((resourceFiles) => {
        return resourceFiles.map((file) => {
          return vscode.workspace.openTextDocument(vscode.Uri.file(file.fsPath)).then((ldoc) => {
            const { Keys: citems, Values: cvalues } = getTranslationKeysInOrder(ldoc);

            citems.forEach((fk, i) => {
              if (fk.startsWith(clickedKey, 0)) {
                const ci = new CompletionItem(`NGX-TRANSLATE: ${fk}`, vscode.CompletionItemKind.Snippet);
                ci.range = range;
                ci.insertText = fk;
                ci.detail = `Translation Value`;
                ci.documentation = `${file.fsPath.split(/(\/|\\)/).pop()}: ${cvalues[i]}`;
                // ci.additionalTextEdits
                completionItems.push(ci);
              }
            });
          });
        });
      })
      .then((mappedResourceFiles) => {
        return Promise.all(mappedResourceFiles).then((_) => {
          const result = new CompletionList(
            completionItems.filter((value, index, self) => index === self.findIndex((s) => s.insertText === value.insertText))
          );
          return result;
        });
      });
  }
}
