"use strict";
import * as vscode from "vscode";
import { ResourceDefinitionProvider } from "./rdp";
import { ResourceHoverProvider } from "./rhp";
import { ResourceCompletionProvider } from "./rcp";
import { zombieCheck } from "./utils";
import { generateTranslationString } from "./generateTranslation";

export function activate(context: vscode.ExtensionContext) {
  // unused keys
  const checkForZombies = vscode.commands.registerCommand("ngxu.zombies", zombieCheck);
  
  // generate translation
  const createTranslation = vscode.commands.registerCommand("ngxu.createTranslation", generateTranslationString);

  // Peek
  const definitionProviderRegistration = vscode.languages.registerDefinitionProvider(
    [
      { language: "html", pattern: "**/*.html" },
      { language: "typescript", pattern: "**/*.ts" },
    ],
    new ResourceDefinitionProvider()
  );

  // Hover
  const hoverProviderRegistration = vscode.languages.registerHoverProvider(
    [
      { language: "html", pattern: "**/*.html" },
      { language: "typescript", pattern: "**/*.ts" },
    ],
    new ResourceHoverProvider()
  );

  // Autocomplete
  const completionProviderRegistration = vscode.languages.registerCompletionItemProvider(
    [
      { language: "html", pattern: "**/*.html" },
      { language: "typescript", pattern: "**/*.ts" },
    ],
    new ResourceCompletionProvider(),
    "."
  );

  context.subscriptions.push(
    definitionProviderRegistration,
    hoverProviderRegistration,
    completionProviderRegistration,
    checkForZombies,
    createTranslation
  );
}

export function deactivate() {}
