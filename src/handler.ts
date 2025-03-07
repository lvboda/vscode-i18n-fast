import { window, workspace, Range, Uri, MarkdownString, env, commands } from 'vscode';
import { isNil, max, flatMapDeep, trim } from 'lodash';
import { match } from 'minimatch';
import { AhoCorasick } from '@monyone/aho-corasick';

import { getConfig } from './config';
import { isRangeIntersect, AST2readableStr, AST2formattedStr, safeCall, truncateByDisplayWidth, getI18nGroups, matchChinese, prevChangedFileUris, setPrevChangedFileUris } from './utils';
import { MemoryDocumentProvider } from './provider';
import { asyncInvokeWithErrorHandler } from './error';
import { COMMAND_CONVERT_KEY, PLUGIN_NAME } from './constant';

import type { TextEditor, ExtensionContext, DecorationOptions } from 'vscode';
import type Hook from './hook';
import type { ConvertGroup, I18nGroup } from './types';

const i18nKeyConflictDecorationType = window.createTextEditorDecorationType({ backgroundColor: 'rgba(255, 0, 0, 0.3)' });
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
        key: key,
        label: `使用 ${key}`,
        description: filePath ? `${workspace.asRelativePath(filePath, false)}${isNil(line) ? '' : `:${line}`}` : ''
    })), { key: IGNORE_KEY, label: '忽略' }], {
        placeHolder: `存在${matchedGroups.length}个重复i18n, 请选择处理方式...`,
    });

    if (res?.key === IGNORE_KEY) return;

    return res?.key;
}

export const createOnCommandConvertHandler = (context: ExtensionContext, hook: Hook) => {
    const handler = async (groups?: ConvertGroup[]) => {
        const { autoMatchChinese, conflictPolicy } = getConfig();

        const editor = window.activeTextEditor;

        if (!editor) return;
        const documentText = editor.document.getText();
        const memoryDocument = await MemoryDocumentProvider.getDocument(documentText);

        // 参数 > 选中 > 当前文件的自定义匹配 > 当前文件的中文匹配
        let convertGroups: ConvertGroup[] = groups || editor.selections.map((selection) => ({ i18nValue: editor.document.getText(selection), range: selection }));

        if (!convertGroups.length) {
            convertGroups.push(...await hook.match({ documentText }));

            if (autoMatchChinese) {
                convertGroups.push(...matchChinese(editor.document));
            }
        }

        const i18nGroups = getI18nGroups(context);
        const processedRanges: Range[] = [];
        convertGroups = await Promise.all(convertGroups.map(async (group) => {
            group.isNew = true;
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

            switch(conflictPolicy) {
                case 'ignore':
                    return group;
                case 'picker': 
                case 'smart':
                    if (matchedGroups.length === 1 && conflictPolicy === 'smart') return { ...group, i18nKey: matchedGroups[0].key, isNew: false };

                    editor.revealRange(group.range);
                    editor.setDecorations(i18nKeyConflictDecorationType, [{
                        range: group.range,
                        // 空范围也显示出来
                        renderOptions: group.range.start.isEqual(group.range.end) ? { after: { contentText: '', width: '10px', height: '100%',  backgroundColor: 'rgba(255, 0, 0, 0.3)' } } : void 0
                    }]);
                    const i18nKey = await getI18nKeyByPicker(matchedGroups);
                    editor.setDecorations(i18nKeyConflictDecorationType, []);
                    return { ...group, i18nKey: i18nKey || group.i18nKey, isNew: !i18nKey };
                case 'reuse':
                default:
                    return { ...group, i18nKey: matchedGroups[0].key, isNew: false };
            }
        }));

        convertGroups = await hook.convert({ convertGroups, document: editor.document });

        const ok = await hook.write({ convertGroups, document: editor.document });

        if (ok) {
            await editor.edit((editBuilder) => {
                convertGroups.forEach(({ range, overwriteText }) => {
                    if (!range || !overwriteText) return;
                    editBuilder.replace(range, overwriteText);
                });
            });

            await editor.document.save();
        }
    };

    return asyncInvokeWithErrorHandler(handler);
}

export const createOnCommandPasteHandler = (context: ExtensionContext, hook: Hook) => {
    const handler = async () => {
        const editor = window.activeTextEditor;
        const copiedText = await env.clipboard.readText();
        if (!editor || !copiedText.trim()) return;

        await commands.executeCommand(COMMAND_CONVERT_KEY, editor.selections.map((selection) => ({ range: selection, i18nValue: copiedText })));
    }

    return asyncInvokeWithErrorHandler(handler);
}

export const createOnCommandUndoHandler = (context: ExtensionContext, hook: Hook) => {
    const handler = async () => {
        const activeUri = window.activeTextEditor?.document.uri;

        for (const uri of [activeUri, ...prevChangedFileUris]) {
            if (!uri) continue;
            const document = await workspace.openTextDocument(uri);
            await window.showTextDocument(document, { preserveFocus: true });
            await commands.executeCommand('undo');
            await document.save();
        }

        setPrevChangedFileUris([]);

        if (activeUri) {
            await window.showTextDocument(await workspace.openTextDocument(activeUri), { preserveFocus: true });
        }
    }

    return asyncInvokeWithErrorHandler(handler);
}

export const createOnDidChangeAddDecorationHandler = (context: ExtensionContext, hook: Hook) => {
    context.subscriptions.push(i18nKeyDecorationType);
    const handler = (editor?: TextEditor) => {
        const { i18nFilePattern } = getConfig();
        if (!editor?.document) return;
        // 排除掉 i18n 文件
        if (!workspace.getWorkspaceFolder(editor.document.uri) || !!match([workspace.asRelativePath(editor.document.uri, false)], i18nFilePattern).length) return;

        const i18nGroups = getI18nGroups(context);
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
