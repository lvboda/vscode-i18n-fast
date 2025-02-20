import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { window, Range, Position, Selection, workspace } from 'vscode';

import { getConfig } from './config';
import Hook from './hook';
import { showMessage } from './tips';
import { getChineseCharList, isJsxTextOrAttribute, writeFileByEditor } from './utils';
import { invokeWithErrorHandler } from './error';

import type { ExtensionContext } from 'vscode';

const hook = Hook.getInstance();

export function createOnCommandConvertHandler(context: ExtensionContext) {
    async function handler(groups?: MatchedGroup[]) {
        const { autoMatchChinese, matchExpr } = getConfig();

        const editor = window.activeTextEditor;

        if (!editor) return;
        const documentText = editor.document.getText();

        // 选中 > 自定义匹配 > 中文匹配
        let matchedGroups = groups || editor.selections.reduce<MatchedGroup[]>((pre, cur) => {
            const selectedText = editor.document.getText(cur).trim();
            if (selectedText) pre.push([selectedText, selectedText]);
            return pre;
        }, []);

        if (!matchedGroups.length) {
            if (matchExpr) {
                matchedGroups.push(...await hook.match({ documentText }));
            }
            if (autoMatchChinese) {
                matchedGroups.push(...getChineseCharList(documentText));
            }
        }

        matchedGroups = matchedGroups.filter((group) => group?.[0] && group?.[1]);

        let editableDocumentText = documentText;
        let lastEnd = 0;
        console.log(matchedGroups, 'matchedGroups');
        for (const matchedGroup of matchedGroups) {
            const [originalText] = matchedGroup;
            const [realText, customParam] = await hook.customParam({ matchedGroup });
            const i18nKey = await hook.i18nKey({ originalText, realText, customParam });
            let isInJsx = false;
            try {
                isInJsx = isJsxTextOrAttribute(editableDocumentText, originalText);
            } catch (error) {
                showMessage('warn', `<isJsxTextOrAttribute error> ${error}`);
            }
            
            const codeOverwriteText = await hook.codeOverwrite({ i18nKey, originalText, realText, customParam: { isInJsx, ...customParam } });

            const start = editableDocumentText.indexOf(originalText);
            const end = start + originalText.length;
            if (start === -1 || !codeOverwriteText) continue;

            if (end > lastEnd) {
                lastEnd = end;
            }

            editableDocumentText = editableDocumentText.replace(originalText, codeOverwriteText);
            matchedGroup[2] = i18nKey;
        }

        const i18nFilePaths = await hook.i18nFilePath({ editor });

        for (const filePath of i18nFilePaths) {
            const content = await fs.readFile(path.join(workspace.getWorkspaceFolder(editor.document.uri)?.uri.fsPath || '', filePath), 'utf-8');
            const overwriteText = await hook.i18nFileOverwrite({ fileContent: content, matchedGroups });
            if (overwriteText) await writeFileByEditor(filePath, overwriteText);
        }

        await editor.edit(editBuilder => {
            editBuilder.replace(new Range(new Position(0, 0), new Position(editor.document.lineCount + 1, 0)), editableDocumentText);
        })

        if (lastEnd > 0) {
            editor.selection = new Selection(editor.document.positionAt(lastEnd), editor.document.positionAt(lastEnd));
        }
    };

    return invokeWithErrorHandler(handler);
}

export function createOnCommandPasteHandler(context: ExtensionContext) {
    async function handler() {
    }

    return invokeWithErrorHandler(handler);
}
