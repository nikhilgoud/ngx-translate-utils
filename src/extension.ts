'use strict';
import * as vscode from 'vscode';
import { ResourceDefinitionProvider } from './rdp';
import { ResourceHoverProvider } from './rhp';
import { ResourceCompletionProvider } from './rcp';
import { zombieCheck } from './zc';
import { generateTranslationString } from './generateTranslation';
import { missingCheck } from './mt';
import { organizeLangFile } from './sp';

export function activate(context: vscode.ExtensionContext) {
  // missed keys
  const checkForMissed = vscode.commands.registerCommand('ngxu.missed', () => missingCheck(context));

  // unused keys
  const checkForZombies = vscode.commands.registerCommand('ngxu.zombies', () => zombieCheck(context));

  // generate translation
  const createTranslation = vscode.commands.registerCommand('ngxu.createTranslation', () => generateTranslationString(context));

  // sync lang files
  const synchronizeFile = vscode.commands.registerCommand('ngxu.organize', () => organizeLangFile(context));

  // Peek
  const definitionProviderRegistration = vscode.languages.registerDefinitionProvider(
    [
      { scheme: 'file', language: 'html', pattern: '**/*.html' },
      { scheme: 'file', language: 'typescript', pattern: '**/*.ts' },
    ],
    new ResourceDefinitionProvider()
  );

  // Hover
  const hoverProviderRegistration = vscode.languages.registerHoverProvider(
    [
      { scheme: 'file', language: 'html', pattern: '**/*.html' },
      { scheme: 'file', language: 'typescript', pattern: '**/*.ts' },
    ],
    new ResourceHoverProvider()
  );

  // Autocomplete
  const completionProviderRegistration = vscode.languages.registerCompletionItemProvider(
    [
      { scheme: 'file', language: 'html', pattern: '**/*.html' },
      { scheme: 'file', language: 'typescript', pattern: '**/*.ts' },
    ],
    new ResourceCompletionProvider(),
    '.'
  );

  context.subscriptions.push(
    definitionProviderRegistration,
    hoverProviderRegistration,
    completionProviderRegistration,
    checkForZombies,
    createTranslation,
    checkForMissed,
    synchronizeFile
  );
}

export function deactivate() {}
