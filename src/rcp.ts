import * as vscode from "vscode";
import {
  TextDocument,
  Position,
  CancellationToken,
  ProviderResult,
  CompletionItemProvider,
  CompletionItem,
  CompletionList,
} from "vscode";
import { GetKeyAtPositionInDocument, getTranslationKeys, getI18nPath, getTranslationValue } from "./utils";

export class ResourceCompletionProvider implements CompletionItemProvider {
  provideCompletionItems(
    document: TextDocument,
    position: Position,
    token: CancellationToken
  ): ProviderResult<CompletionList> {
    const { clickedKey } = GetKeyAtPositionInDocument(position, document);

    
    let completionItems = new Array<CompletionItem>();
    return vscode.workspace
      .findFiles(getI18nPath(), "**​/node_modules/**")
      .then((resourceFiles) => {
        return resourceFiles.map((file) => {
          return vscode.workspace.openTextDocument(vscode.Uri.file(file.fsPath)).then((document) => {
            let json = JSON.parse(document.getText().replace(/\r\n/g, "").replace(/\n/g, ""));
            
            const citems = getTranslationKeys(json, null, []).filter((k) => k.startsWith(clickedKey));

            citems.forEach((f) => {
              const ci = new CompletionItem(f.replace(clickedKey, ""), vscode.CompletionItemKind.Text);
              ci.documentation = `${file.fsPath.split(/(\/|\\)/).pop()}:- ${getTranslationValue(json, f)}`;
              completionItems.push(ci);
            });
          });
        });
      })
      .then((mappedResourceFiles) => {
        return Promise.all(mappedResourceFiles).then((_) => {
          const result = new CompletionList(completionItems);
          return result;
        });
      });
  }
}
