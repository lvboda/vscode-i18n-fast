import { commands, languages, Position, Range, window, workspace } from 'vscode';
import { debounce } from 'lodash';

import { COMMAND_CONVERT_KEY, COMMAND_PASTE_KEY } from './constant';
import { createOnCommandConvertHandler, createOnCommandPasteHandler, createOnDidChangeAddDecorationHandler, createProvideDefinitionHandler } from './handler';
import Hook from './hook';
import { watchHook, watchI18n } from './watch'

import type { ExtensionContext } from 'vscode';

export async function activate(context: ExtensionContext) {
	const hook = Hook.getInstance();
	const hookWatcher = await watchHook(hook);
	const i18nWatcher = await watchI18n(hook, context);

	const provideDefinition = createProvideDefinitionHandler(context, hook);
	const onDidChangeAddDecorationHandler = createOnDidChangeAddDecorationHandler(context, hook);
	onDidChangeAddDecorationHandler(window.activeTextEditor);
	const debouncedOnDidChangeAddDecorationHandler = debounce(onDidChangeAddDecorationHandler, 300);

	context.subscriptions.push(
		commands.registerCommand(COMMAND_CONVERT_KEY, createOnCommandConvertHandler(context, hook)),
		commands.registerCommand(COMMAND_PASTE_KEY, createOnCommandPasteHandler(context, hook)),
		window.onDidChangeActiveTextEditor((editor) => onDidChangeAddDecorationHandler(editor)),
		workspace.onDidChangeTextDocument(() => debouncedOnDidChangeAddDecorationHandler(window.activeTextEditor)),
		window.onDidChangeTextEditorVisibleRanges(() => debouncedOnDidChangeAddDecorationHandler(window.activeTextEditor)),
		languages.registerDefinitionProvider('*', { provideDefinition }),
		hookWatcher,
		i18nWatcher,
	);
}

export function deactivate() { }
