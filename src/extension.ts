import { commands, languages, window, workspace } from 'vscode';
import { debounce } from 'lodash';

import Hook from './hook';
import I18n from './i18n';
import { getWorkspaceKey, FileSnapshotStack } from './utils';
import { I18nJumpProvider, MemoryDocumentProvider } from './provider';
import { COMMAND_CONVERT_KEY, COMMAND_PASTE_KEY, COMMAND_UNDO_KEY, PLUGIN_NAME } from './constant';
import { 
    createConvertHandler, 
    createPasteHandler, 
    createUndoHandler, 
    createDecorationHandler 
} from './handlers';

import type { ExtensionContext } from 'vscode';

export async function activate(context: ExtensionContext) {
	const decorationHandler = createDecorationHandler();
	const debouncedDecorationHandler = debounce(decorationHandler, 300);

	I18n.getInstance().onChange(() => debouncedDecorationHandler());
	Hook.getInstance().onChange(() => I18n.getInstance().reload());

	await Hook.getInstance().init(context);
	await I18n.getInstance().init();

	context.subscriptions.push(
		languages.registerDefinitionProvider('*', I18nJumpProvider.getInstance()),
		workspace.registerTextDocumentContentProvider('memory', MemoryDocumentProvider.getInstance()),
		commands.registerCommand(COMMAND_CONVERT_KEY, createConvertHandler()),
		commands.registerCommand(COMMAND_PASTE_KEY, createPasteHandler()),
		commands.registerCommand(COMMAND_UNDO_KEY, createUndoHandler()),
		window.onDidChangeActiveTextEditor((editor) => decorationHandler(editor)),
		window.onDidChangeTextEditorVisibleRanges(() => debouncedDecorationHandler()),
		workspace.onDidChangeTextDocument(() => debouncedDecorationHandler()),
		workspace.onDidChangeConfiguration(async (event) => {
			if ([`${PLUGIN_NAME}.hookFilePattern`, `${PLUGIN_NAME}.i18nFilePattern`].some((key) => event.affectsConfiguration(key))) {
				await Hook.getInstance().reload();
				await I18n.getInstance().reload();
			}
		})
	);
}

export async function deactivate() {
	FileSnapshotStack.getInstance().dispose();

	const workspaceKey = getWorkspaceKey();
	if (workspaceKey) {
		await Hook.getInstance().dispose(workspaceKey);
		await I18n.getInstance().dispose(workspaceKey);
	}
}
