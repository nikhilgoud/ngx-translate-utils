import { CancellationToken, Hover, HoverProvider, MarkdownString, Position, TextDocument } from "vscode";
import { FindObjectsForKeyInResourceFiles, GetKeyAtPositionInDocument } from "./utils";

export class ResourceHoverProvider implements HoverProvider {
  provideHover(document: TextDocument, position: Position, token: CancellationToken) {
    const { clickedKey, range } = GetKeyAtPositionInDocument(position, document);
    if (!clickedKey) {
      return null; // Returns null when no key exists.
    }

    return FindObjectsForKeyInResourceFiles(clickedKey).then((foundObjects) => {
      if (!foundObjects || foundObjects.every((m) => !m.match)) {
        // Return null because the clicked key was not found in any resource files.
        return null;
      }
      let md = new MarkdownString();
      md.appendMarkdown(`\`${clickedKey}\``);
      md.appendText("\n");
      md.appendMarkdown('***');
      md.appendText("\n");
      foundObjects.sort((a, b) => (a.match ? 1 : -1));
      foundObjects.forEach((l) => {
        let cc = "";
        if (l.match) {
          // let openCommandUri = Uri.parse(`command:open?${encodeURIComponent(JSON.stringify([{ resource: ff.uri }]))}`);
          let openCommandUri = "";
          // cc = `[${l.path.split("/").pop()}](${openCommandUri}) - ${l.value}`;
          cc = `${l.fileName} - \`\`\`${l.value}\`\`\``;
        } else {
          cc = `${l.fileName} - NOT FOUND`;
        }

        md.appendMarkdown(cc);
        md.appendText("\n\n");
      });

      md.isTrusted = true;
      // Return a Hover with the key's value.
      return new Hover(md, range);
    });
  }
}
