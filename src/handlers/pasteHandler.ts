import { window, env, commands } from 'vscode';

import { asyncInvokeWithErrorHandler } from '@/utils/error';
import { COMMAND_CONVERT_KEY } from '@/utils/constant';

import type { ConvertGroup } from '@/types';

/**
 * 处理粘贴并转换功能
 * 从剪贴板读取文本，并将其转换为 i18n key
 */
export const createPasteHandler = () => {
    const handler = async () => {
        const editor = window.activeTextEditor;
        if (!editor) {
            return;
        }

        const clipboardText = await env.clipboard.readText();
        if (!clipboardText.trim()) {
            return;
        }

        const convertGroups: ConvertGroup[] = editor.selections.map(selection => ({
            range: selection,
            i18nValue: clipboardText
        }));

        await commands.executeCommand(COMMAND_CONVERT_KEY, convertGroups);
    };

    return asyncInvokeWithErrorHandler(handler);
};