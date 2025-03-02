import { window, Selection, workspace, Range, Uri, MarkdownString, env, commands, Position } from 'vscode';
import { isNil, merge, max, flatMapDeep } from 'lodash';
import { match } from 'minimatch';
import { AhoCorasick } from '@monyone/aho-corasick';

import { getConfig } from './config';
import { getChineseCharList, isRangeIntersect, AST2readableStr, AST2formattedStr, safeCall, truncateByDisplayWidth, getI18nGroups } from './utils';
import { asyncInvokeWithErrorHandler, invokeWithErrorHandler } from './error';
import { COMMAND_CONVERT_KEY, PLUGIN_NAME } from './constant';

import type { TextEditor, ExtensionContext, TextDocument, DecorationOptions } from 'vscode';
import type Hook from './hook';
import type { ConvertGroup } from './types';

export const createOnCommandConvertHandler = (context: ExtensionContext, hook: Hook) => {
    const handler = async (groups?: ConvertGroup[], outerDocumentText?: string) => {
        const { autoMatchChinese } = getConfig();

        const editor = window.activeTextEditor;

        if (!editor) return;
        const documentText = outerDocumentText || editor.document.getText();

        // 参数 > 选中 > 当前文件的自定义匹配 > 当前文件的中文匹配
        let convertGroups = groups || editor.selections.reduce<ConvertGroup[]>((pre, cur) => {
            const selectedText = editor.document.getText(cur).trim();
            if (selectedText) pre.push({ matchedText: selectedText, i18nValue: selectedText, range: cur });
            return pre;
        }, []);

        if (!convertGroups.length) {
            convertGroups.push(...await hook.match({ documentText }));

            if (autoMatchChinese) {
                convertGroups.push(...getChineseCharList(documentText));
            }
        }

        let editingDocumentText = documentText;
        convertGroups = convertGroups.filter((group) => group.matchedText && group.i18nValue);
        for (const convertGroup of convertGroups) {
            merge(convertGroup, await hook.convert({ convertGroup: { ...convertGroup, documentText, editingDocumentText } }));
            const { matchedText, overwriteText } = convertGroup;

            const start = editingDocumentText.indexOf(matchedText);
            if (start === -1 || !overwriteText) continue;

            editingDocumentText = editingDocumentText.replace(matchedText, overwriteText);
        }

        await hook.write({ convertGroups, editedDocumentText: editingDocumentText, documentUri: editor.document.uri });
    };

    return asyncInvokeWithErrorHandler(handler);
}

export const createOnCommandPasteHandler = (context: ExtensionContext, hook: Hook) => {
    const handler = async () => {
        const editor = window.activeTextEditor;
        const copiedText = await env.clipboard.readText();
        if (!editor || !copiedText) return;

        const position = editor.selection.active;

        const documentText = editor.document.getText();

        const index = position.character;
        const lines = documentText.split('\n');

        if (position.line >= lines.length) return;

        lines[position.line] = lines[position.line].slice(0, index) + copiedText + lines[position.line].slice(index);

        await commands.executeCommand(COMMAND_CONVERT_KEY, [{ matchedText: copiedText, i18nValue: copiedText }], lines.join('\n'));
    }

    return asyncInvokeWithErrorHandler(handler);
}

const i18nKeyDecorationType = window.createTextEditorDecorationType({ after: { color: '#999999', backgroundColor: 'rgba(0, 0, 0, 0.2)', margin: '0 5px' } });
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

export const createProvideDefinitionHandler = (context: ExtensionContext, hook: Hook) => {
    const handler = (document: TextDocument, position: Position) => {
        // 排除掉 i18n 文件
        const { i18nFilePattern } = getConfig();
        if (!workspace.getWorkspaceFolder(document.uri) || !!match([workspace.asRelativePath(document.uri, false)], i18nFilePattern).length) return;

        const i18nGroups = getI18nGroups(context);
        const [matched] = (new AhoCorasick(i18nGroups.map(({ key }) => key)))
            .matchInText(document.lineAt(position.line).text)
            .sort((a, b) => b.keyword.length - a.keyword.length)
            .map(({ keyword, begin, end }) => ({ keyword, range: new Range(new Position(position.line, begin), new Position(position.line, end)) }))
            .filter(({ range }) => range.contains(new Range(position, position)));

        if (!matched) return;
        const { filePath, line = 0 } = i18nGroups.find(({ key }) => key === matched.keyword) || {};
        if (!filePath) return;
        const lineEndPos = new Position(max([line - 1, 0]) || 0, Number.MAX_SAFE_INTEGER);
        return [{
            targetUri: Uri.file(filePath),
            targetRange: new Range(lineEndPos, lineEndPos),
            originSelectionRange: matched.range,
        }];
    }
    return invokeWithErrorHandler(handler);
}