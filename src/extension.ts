import { commands, languages, window, workspace } from 'vscode';
import { debounce } from 'lodash';

import Hook from './hook';
import I18n from './i18n';
import { getConfig } from './config';
import { getWorkspaceKey } from './utils';
import { I18nJumpProvider, MemoryDocumentProvider } from './provider';
import { COMMAND_CONVERT_KEY, COMMAND_PASTE_KEY, COMMAND_UNDO_KEY, PLUGIN_NAME } from './constant';
import { createOnCommandConvertHandler, createOnCommandPasteHandler, createOnCommandUndoHandler, createOnDidChangeAddDecorationHandler } from './handler';

import type { ExtensionContext } from 'vscode';

const hook = Hook.getInstance();
const i18n = I18n.getInstance();

export async function activate(context: ExtensionContext) {
	await hook.init(i18n);
	await i18n.init(hook);

	const onDidChangeAddDecorationHandler = createOnDidChangeAddDecorationHandler(i18n);
	onDidChangeAddDecorationHandler(window.activeTextEditor);
	const debouncedOnDidChangeAddDecorationHandler = debounce(onDidChangeAddDecorationHandler, 300);

	const i18nJumpProvider = I18nJumpProvider.getInstance(i18n);
	const memoryDocumentProvider = MemoryDocumentProvider.getInstance();

	context.subscriptions.push(
		languages.registerDefinitionProvider('*', i18nJumpProvider),
		workspace.registerTextDocumentContentProvider('memory', memoryDocumentProvider),
		commands.registerCommand(COMMAND_CONVERT_KEY, createOnCommandConvertHandler(hook, i18n)),
		commands.registerCommand(COMMAND_PASTE_KEY, createOnCommandPasteHandler()),
		commands.registerCommand(COMMAND_UNDO_KEY, createOnCommandUndoHandler()),
		window.onDidChangeActiveTextEditor((editor) => onDidChangeAddDecorationHandler(editor)),
		workspace.onDidChangeTextDocument(() => debouncedOnDidChangeAddDecorationHandler(window.activeTextEditor)),
		window.onDidChangeTextEditorVisibleRanges(() => debouncedOnDidChangeAddDecorationHandler(window.activeTextEditor)),
		workspace.onDidChangeConfiguration(async (event) => {
			if ([`${PLUGIN_NAME}.hookFilePattern`, `${PLUGIN_NAME}.i18nFilePattern`].some((key) => event.affectsConfiguration(key))) {
				const { hookFilePattern, i18nFilePattern } = getConfig();
				await hook.reload(i18n, hookFilePattern);
				await i18n.reload(hook, i18nFilePattern);
			}
		}),
	);
}

export async function deactivate() {
	const workspaceKey = getWorkspaceKey();
	if (workspaceKey) {
		hook.dispose(workspaceKey);
		i18n.dispose(workspaceKey);
	}
}
