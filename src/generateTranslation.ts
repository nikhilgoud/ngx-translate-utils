import * as copypaste from "copy-paste";
import * as vscode from "vscode";
import {
  getCurrentVscodeSettings,
  getTranslationKeyFromString,
  ConfigurationSettings,
  FindObjectsForKeyInResourceFiles,
} from "./utils";

export async function generateTranslationString(context: vscode.ExtensionContext) {
  const settings: ConfigurationSettings = getCurrentVscodeSettings();

  // Get the active editor window
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("Select text to translate");
    return;
  }
  // Fetch the selected text
  const selectedText = editor.document.getText(editor.selection);
  if (!selectedText) {
    vscode.window.showInformationMessage("Select text to translate");
    return;
  }

  return FindObjectsForKeyInResourceFiles(selectedText, false).then(async (foundObjects) => {
    let input = await vscode.window.showInputBox({
      value: foundObjects[0].key,
      prompt: "Gets key from default lang file, Modify key for this translation or leave blank to use value",
      placeHolder: 'e.g. "hello world" will generate a key named "HELLO_WORLD"',
    });
    if (input === undefined) {
      // cancelled
      return;
    }
    try {
      const key = getTranslationKeyFromString(input || selectedText, settings.caseMode, settings.autocapitalize);
      // Generate a json key/value pair
      const value = `"${key}": "${selectedText}"`;
      // Copy the translation json to the clipboard
      copypaste.copy(value);
      let editorRange: any = editor.selection;
      if (settings.replaceOnTranslate) {
        // Replace the selection text with the translated key
        const padding = settings.padding ? " " : "";
        const quote = settings.quote;
        let translation = "";
        if (editor.document.languageId === "html") {
          translation = `{{${padding}${quote}${key}${quote} | ${settings.translatePipeName}${padding}}}`;
        } else {
          translation = settings.translatePlaceholder.replace("{key}", `${quote}${key}${quote}`);
          editorRange = new vscode.Range(
            new vscode.Position(editor.selection.start.line, editor.selection.start.character - 1),
            new vscode.Position(editor.selection.end.line, editor.selection.end.character + 1)
          );
        }
        editor
          .edit((builder) => {
            builder.replace(editorRange, translation);
          })
          .then((_) => {
            const index = editor.document.lineAt(editor.selection.start.line).text.indexOf(translation);
            editor.selection = new vscode.Selection(
              editor.selection.start.line,
              index,
              editor.selection.end.line,
              index + translation.length
            );
          });
      }
    } catch (error) {
      console.error("Replace Key Failed", error);
    }
  });
}
