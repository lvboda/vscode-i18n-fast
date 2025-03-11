import { window, workspace, Range, Uri, MarkdownString, env, commands } from 'vscode';
import { isNil, max, flatMapDeep, countBy } from 'lodash';
import { match } from 'minimatch';
import { AhoCorasick } from '@monyone/aho-corasick';

import localize from './localize';
import { showMessage } from './tips';
import { getConfig } from './config';
import { asyncInvokeWithErrorHandler } from './error';
import { COMMAND_CONVERT_KEY, PLUGIN_NAME } from './constant';
import { isRangeIntersect, AST2readableStr, AST2formattedStr, safeCall, truncateByDisplayWidth, matchChinese, getWriteHistory, clearWriteHistory, isLoading } from './utils';

import type { TextEditor, DecorationOptions } from 'vscode';
import type { ConvertGroup, I18nGroup } from './types';
import type Hook from './hook';
import type I18n from './i18n';

const i18nKeyConflictDecorationType = window.createTextEditorDecorationType({ backgroundColor: 'rgba(255, 0, 0, 0.5)' });
const i18nKeyDecorationType = window.createTextEditorDecorationType({
    light: {
        after: {
            margin: '0 5px',
            color: '#838383',
            backgroundColor: '#F6F6F6',
        }
    },
    dark: {
        after: {
            margin: '0 5px',
            color: '#999999',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
        }
    }
});

const IGNORE_KEY = 'IGNORE';
const getI18nKeyByPicker = async (matchedGroups: I18nGroup[]) => {
    const res = await window.showQuickPick([...matchedGroups.map(({ key, filePath, line }) => ({
        key,
        label: key,
        description: filePath ? `${workspace.asRelativePath(filePath, false)}${isNil(line) ? '' : `:${line}`}` : ''
    })), { key: IGNORE_KEY, label: localize("handler.ignore") }], {
        placeHolder: localize("handler.conflict.tip", String(matchedGroups.length)),
    });

    if (res?.key === IGNORE_KEY) return;

    return res?.key;
}

export const createOnCommandConvertHandler = (hook: Hook, i18n: I18n) => {
    const handler = async (groups?: ConvertGroup[]) => {
        const editor = window.activeTextEditor;

        if (!editor) return;
        
        clearWriteHistory();
        const documentText = editor.document.getText();

        // 参数 > 选中 > 当前文件的自定义匹配 > 当前文件的中文匹配
        let convertGroups: ConvertGroup[] = groups || editor.selections.map((selection) => ({ i18nValue: editor.document.getText(selection), range: selection }));

        if (!convertGroups.length) {
            convertGroups.push(...await hook.match({ document: editor.document }));

            if (getConfig().autoMatchChinese) {
                convertGroups.push(...matchChinese(editor.document));
            }
        }

        const i18nGroups = i18n.getI18nGroups();
        const processedRanges: Range[] = [];
        convertGroups = await Promise.all(convertGroups.map(async (group) => {
            group.type = 'new';
            // 匹配 range
            if (!group.range && group.matchedText) {
                let index = documentText.indexOf(group.matchedText);

                while (index !== -1) {
                    const range = new Range(
                        editor.document.positionAt(index),
                        editor.document.positionAt(index + group.matchedText.length)
                    );
        
                    if (!processedRanges.some((processedRange) => isRangeIntersect(processedRange, range))) {
                        processedRanges.push(range);
                        group.range = range;
                        break;
                    }
        
                    index = documentText.indexOf(group.matchedText, index + group.matchedText.length);
                }
            }

            // 当有重复 i18n 时
            const matchedGroups = i18nGroups.filter(({ value }) => value === group.i18nValue);
            if (!group.range || !matchedGroups.length) return group;

            const { conflictPolicy } = getConfig();
            switch(conflictPolicy) {
                case 'ignore':
                    return group;
                case 'picker': 
                case 'smart':
                    if (matchedGroups.length === 1 && conflictPolicy === 'smart') return { ...group, i18nKey: matchedGroups[0].key, type: 'ready' };

                    editor.revealRange(group.range);
                    editor.setDecorations(i18nKeyConflictDecorationType, [{
                        range: group.range,
                        // 空范围也显示出来
                        renderOptions: group.range.start.isEqual(group.range.end) ? { after: { contentText: '', width: '10px', height: '100%',  backgroundColor: 'rgba(255, 0, 0, 0.5)' } } : void 0
                    }]);
                    const i18nKey = await getI18nKeyByPicker(matchedGroups);
                    editor.setDecorations(i18nKeyConflictDecorationType, []);
                    return { ...group, i18nKey: i18nKey || group.i18nKey, type: !!i18nKey ? 'ready' : 'new' };
                case 'reuse':
                default:
                    return { ...group, i18nKey: matchedGroups[0].key, type: 'ready' };
            }
        }));

        convertGroups = await hook.convert({ convertGroups, document: editor.document });

        await hook.write({ convertGroups, editor, document: editor.document });
    };

    return asyncInvokeWithErrorHandler(handler);
}

export const createOnCommandPasteHandler = () => {
    const handler = async () => {
        const editor = window.activeTextEditor;
        const copiedText = await env.clipboard.readText();
        if (!editor || !copiedText.trim()) return;

        await commands.executeCommand(COMMAND_CONVERT_KEY, editor.selections.map((selection) => ({ range: selection, i18nValue: copiedText })));
    }

    return asyncInvokeWithErrorHandler(handler);
}

export const createOnCommandUndoHandler = () => {
    const handler = async () => {
        if (isLoading()) return showMessage('info', localize("handler.undo.loading.tip"));

        const activeUri = window.activeTextEditor?.document.uri;

        for (const [path, writeCount] of Object.entries(countBy(getWriteHistory(), (uri) => uri.fsPath))) {
            const document = await workspace.openTextDocument(Uri.file(path));
            await window.showTextDocument(document, { preserveFocus: true });
            
            for (let i = 0; i < writeCount; i++) {
                await commands.executeCommand('undo');
            }
        }

        clearWriteHistory();

        if (activeUri) await window.showTextDocument(await workspace.openTextDocument(activeUri), { preserveFocus: true });
    }

    return asyncInvokeWithErrorHandler(handler);
}

export const createOnDidChangeAddDecorationHandler = (i18n: I18n) => {
    const handler = async (editor?: TextEditor) => {
        if (!editor?.document) return;
        // 排除掉 i18n 文件
        const { i18nFilePattern } = getConfig();
        if (!i18nFilePattern || !workspace.getWorkspaceFolder(editor.document.uri) || !!match([workspace.asRelativePath(editor.document.uri, false)], i18nFilePattern).length) return;

        const i18nGroups = i18n.getI18nGroups();
        const processedRanges: Range[] = [];
        const decorationOptions = flatMapDeep(editor.visibleRanges, ({ start, end }) => {
            // 扩容可见区域
            const lineCount = end.line - start.line;
            const deltaVisibleRange = new Range(
                start.translate(start.line - lineCount < 0 ? 0 : -lineCount),
                end.translate(end.line + lineCount > editor.document.lineCount ? editor.document.lineCount : lineCount)
            );

            return (new AhoCorasick(i18nGroups.map(({ key }) => key)))
                .matchInText(editor.document.getText(deltaVisibleRange))
                .sort((a, b) => b.keyword.length - a.keyword.length)
                .reduce<DecorationOptions[]>((pre, { keyword, begin, end }) => {
                    const { key, value, valueAST, filePath, line } = i18nGroups.find(({ key }) => key === keyword) || {};
                    const legalLine = max([line, 0]) || 0;
                    if (!key || !value) return pre;

                    const decorationText = valueAST ? safeCall(AST2readableStr, [valueAST], () => value) : value;
                    const contentText = truncateByDisplayWidth(decorationText);
                    const offset = editor.document.offsetAt(deltaVisibleRange.start);
                    const range = new Range(editor.document.positionAt(begin + offset), editor.document.positionAt(end + offset));
                    if (processedRanges.some((processedRange) => isRangeIntersect(processedRange, range)) || !range.isSingleLine) return pre;
                    processedRanges.push(range);

                    const hoverMessage = new MarkdownString;
                    hoverMessage.appendMarkdown(`**[${PLUGIN_NAME}]**\n\n`);
                    hoverMessage.appendCodeblock(valueAST ? safeCall(AST2formattedStr, [valueAST], () => value) : value, 'plaintext')
                    filePath && hoverMessage.appendMarkdown(`[${workspace.asRelativePath(filePath, false)}${isNil(line) ? '' : `:${legalLine}`}](${Uri.parse(filePath)}#${legalLine})`);

                    return [...pre, { range, hoverMessage, renderOptions: { after: { contentText } } }];
                }, []);
        });

        editor.setDecorations(i18nKeyDecorationType, decorationOptions);
    }
    return asyncInvokeWithErrorHandler(handler);
}
