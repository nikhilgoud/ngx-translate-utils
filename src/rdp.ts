import { TextDocument, Uri, Position, CancellationToken, Location, ProviderResult, DefinitionProvider } from "vscode";
import { GetKeyAtPositionInDocument, FindObjectsForKeyInResourceFiles } from "./utils";

export class ResourceDefinitionProvider implements DefinitionProvider {
  provideDefinition(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Location[]> {
    const { clickedKey } = GetKeyAtPositionInDocument(position, document);
    if (!clickedKey) {
      return null; // Returns null when no key exists.
    }

    return FindObjectsForKeyInResourceFiles(clickedKey).then((foundObjects) => {
      if (!foundObjects) {
        // Return null because the clicked key was not found in any resource files.
        return null;
      }

      // Return a location per match.
      const locations = new Array<Location>();
      foundObjects.forEach((object) => {
        locations.push(new Location(Uri.file(object.path), new Position(object.lineNumber, 0)));
      });

      return locations;
    });
  }
}
