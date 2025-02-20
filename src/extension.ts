import { commands } from 'vscode';

import { COMMAND_CONVERT_KEY, COMMAND_PASTE_KEY } from './constant';
import { createOnCommandConvertHandler, createOnCommandPasteHandler } from './handler';

import type { ExtensionContext } from 'vscode';

export async function activate(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand(COMMAND_CONVERT_KEY, createOnCommandConvertHandler(context)),
		commands.registerCommand(COMMAND_PASTE_KEY, createOnCommandPasteHandler(context)),
	);
}

export function deactivate() { }
