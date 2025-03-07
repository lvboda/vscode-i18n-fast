import { commands, languages, window, workspace, Uri, Range } from 'vscode';
import { debounce } from 'lodash';

import { COMMAND_CONVERT_KEY, COMMAND_PASTE_KEY, COMMAND_UNDO_KEY } from './constant';
import { createOnCommandConvertHandler, createOnCommandPasteHandler, createOnCommandUndoHandler, createOnDidChangeAddDecorationHandler } from './handler';
import { I18nJumpProvider, MemoryDocumentProvider } from './provider';
import Hook from './hook';
import { watchHook, watchI18n } from './watch'

import type { ExtensionContext } from 'vscode';

export async function activate(context: ExtensionContext) {
	const hook = Hook.getInstance();
	const hookWatcher = await watchHook(hook);
	const i18nWatcher = await watchI18n(hook, context);

	const onDidChangeAddDecorationHandler = createOnDidChangeAddDecorationHandler(context, hook);
	onDidChangeAddDecorationHandler(window.activeTextEditor);
	const debouncedOnDidChangeAddDecorationHandler = debounce(onDidChangeAddDecorationHandler, 300);

	const i18nJumpProvider = I18nJumpProvider.getInstance(context);
	const memoryDocumentProvider = MemoryDocumentProvider.getInstance();

	context.subscriptions.push(
		languages.registerDefinitionProvider('*', i18nJumpProvider),
		workspace.registerTextDocumentContentProvider('memory', memoryDocumentProvider),
		commands.registerCommand(COMMAND_CONVERT_KEY, createOnCommandConvertHandler(context, hook)),
		commands.registerCommand(COMMAND_PASTE_KEY, createOnCommandPasteHandler(context, hook)),
		commands.registerCommand(COMMAND_UNDO_KEY, createOnCommandUndoHandler(context, hook)),
		window.onDidChangeActiveTextEditor((editor) => onDidChangeAddDecorationHandler(editor)),
		workspace.onDidChangeTextDocument(() => debouncedOnDidChangeAddDecorationHandler(window.activeTextEditor)),
		window.onDidChangeTextEditorVisibleRanges(() => debouncedOnDidChangeAddDecorationHandler(window.activeTextEditor)),
		hookWatcher,
		i18nWatcher,
	);
}

export function deactivate() { }
