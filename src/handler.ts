import { window, workspace, Range, Uri, MarkdownString, env, commands } from 'vscode';
import { isNil, max, flatMapDeep } from 'lodash';
import { match } from 'minimatch';
import { AhoCorasick } from '@monyone/aho-corasick';

import Hook from './hook';
import I18n from './i18n';
import localize from './localize';
import { showMessage } from './tips';
import { getConfig } from './config';
import { asyncInvokeWithErrorHandler } from './error';
import { MatchType, SupportType, ConvertType, ConflictPolicy } from './types/enums';
import { COMMAND_CONVERT_KEY, PLUGIN_NAME } from './constant';
import {
    AST2readableStr,
    AST2formattedStr,
    safeCall,
    truncateByDisplayWidth,
    matchChinese,
    getLoading,
    checkSupportType,
    FileSnapshotStack,
    writeFileByEditor,
    asyncMap
} from './utils';

import type { DecorationOptions } from 'vscode';
import type { ConvertGroup, I18nGroup } from './types';

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

    if (res?.key === IGNORE_KEY) {
        return;
    }

    return res?.key;
}

export const createOnCommandConvertHandler = () => {
    const handler = async (groups?: ConvertGroup[]) => {
        const editor = window.activeTextEditor;

        if (!editor) {
            return;
        }
        
        FileSnapshotStack.getInstance().next();
        const document = editor.document;
        const documentText = document.getText();

        // 参数 > 选中 > 当前文件的自定义匹配 > 当前文件的中文匹配
        let convertGroups = groups || editor.selections.reduce<ConvertGroup[]>((pre, cur) => {
            const i18nValue = document.getText(cur);
            if (!cur.isEmpty && i18nValue) {
                pre.push({ i18nValue, range: cur });
            }
            return pre;
        }, []);

        if (!convertGroups.length) {
            convertGroups.push(...await Hook.getInstance().match({ document }));

            if (getConfig().autoMatchChinese) {
                convertGroups.push(...matchChinese(document));
            }
        }

        if (convertGroups.every(({ i18nValue }) => !i18nValue.trim())) {
            return;
        }

        const i18nGroups = I18n.getInstance().getI18nGroups();
        const processedRanges: Range[] = [];
        convertGroups = await asyncMap(convertGroups, async (group) => {
            group.type = ConvertType.New;
            // 匹配 range
            if (!group.range && group.matchedText) {
                let index = documentText.indexOf(group.matchedText);

                while (index !== -1) {
                    const range = new Range(
                        document.positionAt(index),
                        document.positionAt(index + group.matchedText.length)
                    );
        
                    if (!processedRanges.some((processedRange) => !!range.intersection(processedRange))) {
                        processedRanges.push(range);
                        group.range = range;
                        break;
                    }
        
                    index = documentText.indexOf(group.matchedText, index + group.matchedText.length);
                }
            }

            // 当有重复 i18n 时
            const matchedGroups = i18nGroups.filter(({ value }) => value === group.i18nValue);
            if (!group.range || !matchedGroups.length) {
                return group;
            }

            const { conflictPolicy } = getConfig();
            switch(conflictPolicy) {
                case ConflictPolicy.Ignore:
                    return group;
                case ConflictPolicy.Picker: 
                case ConflictPolicy.Smart:
                    if (matchedGroups.length === 1 && conflictPolicy === ConflictPolicy.Smart) {
                        return { ...group, i18nKey: matchedGroups[0].key, type: ConvertType.Exist };
                    }

                    editor.revealRange(group.range);
                    editor.setDecorations(i18nKeyConflictDecorationType, [{
                        range: group.range,
                        // 空范围也显示出来
                        renderOptions: group.range.start.isEqual(group.range.end) ? { after: { contentText: '', width: '10px', height: '100%',  backgroundColor: 'rgba(255, 0, 0, 0.5)' } } : void 0
                    }]);
                    const i18nKey = await getI18nKeyByPicker(matchedGroups);
                    editor.setDecorations(i18nKeyConflictDecorationType, []);
                    return { ...group, i18nKey: i18nKey || group.i18nKey, type: !!i18nKey ? ConvertType.Exist : ConvertType.New };
                case ConflictPolicy.Reuse:
                default:
                    return { ...group, i18nKey: matchedGroups[0].key, type: ConvertType.Exist };
            }
        });

        convertGroups = await Hook.getInstance().convert({ convertGroups, document });

        await Hook.getInstance().write({ convertGroups, document });
    };

    return asyncInvokeWithErrorHandler(handler);
}

export const createOnCommandPasteHandler = () => {
    const handler = async () => {
        const editor = window.activeTextEditor;
        const copiedText = await env.clipboard.readText();
        if (!editor || !copiedText.trim()) {
            return;
        }

        await commands.executeCommand(COMMAND_CONVERT_KEY, editor.selections.map((selection) => ({ range: selection, i18nValue: copiedText })));
    }

    return asyncInvokeWithErrorHandler(handler);
}

export const createOnCommandUndoHandler = () => {
    const handler = async () => {
        if (getLoading()) {
            return showMessage('info', localize("handler.undo.loading.tip"));
        }

        if (FileSnapshotStack.getInstance().isEmpty()) {
            return showMessage('info', localize("handler.undo.empty.tip", String(FileSnapshotStack.MAX_SIZE)));
        }

        const map = FileSnapshotStack.getInstance().pop();
        if (!map) {
            return;
        }

        for (const [uri, snapshot] of map.entries()) {
            await writeFileByEditor(uri, snapshot, false, false);
        }
    }

    return asyncInvokeWithErrorHandler(handler);
}

const genRenderOptions = ({ value, valueAST, renderOption }: I18nGroup) => {
    if (isNil(value) && isNil(valueAST)) {
        return;
    }

    if (renderOption) {
        return renderOption;
    }

    return {
        after: {
            contentText: truncateByDisplayWidth(valueAST ? safeCall(AST2readableStr, [valueAST], () => value) : value)
        }
    };
}

const genHoverMessage = ({ value, valueAST, filePath, line, hoverMessage }: I18nGroup) => {
    if (isNil(value) && isNil(valueAST)) {
        return;
    }

    if (hoverMessage) {
        return hoverMessage;
    }

    const ms = new MarkdownString();
    ms.appendMarkdown(`**[${PLUGIN_NAME}]**\n\n`);
    ms.appendCodeblock(valueAST ? safeCall(AST2formattedStr, [valueAST], () => value) : value, 'plaintext');

    if (!isNil(filePath)) {
        const legalLine = max([line, 0]) || 0;
        ms.appendMarkdown(`[${workspace.asRelativePath(filePath, false)}${isNil(line) ? '' : `:${legalLine}`}](${Uri.parse(filePath)}#${legalLine})`);
    }

    return ms;
}

export const createOnDidChangeAddDecorationHandler = () => {
    const handler = async (editor = window.activeTextEditor) => {
        if (!editor?.document) {
            return;
        }
        // 排除掉 i18n 文件
        const { i18nFilePattern } = getConfig();
        if (!i18nFilePattern || !workspace.getWorkspaceFolder(editor.document.uri) || !!match([workspace.asRelativePath(editor.document.uri, false)], i18nFilePattern).length) {
            return;
        }

        const i18nGroups = I18n.getInstance().getI18nGroups();
        const processedRanges: Range[] = [];
        const matchedI18nGroups = flatMapDeep(editor.visibleRanges, ({ start, end }) => {
            // 扩容可见区域
            const lineCount = end.line - start.line;
            const deltaVisibleRange = new Range(
                start.translate(start.line - lineCount < 0 ? 0 : -lineCount),
                end.translate(end.line + lineCount > editor.document.lineCount ? editor.document.lineCount : lineCount)
            );

            return (new AhoCorasick(i18nGroups.map(({ key }) => key)))
                .matchInText(editor.document.getText(deltaVisibleRange))
                .sort((a, b) => b.keyword.length - a.keyword.length)
                .reduce<I18nGroup[]>((pre, { keyword, begin, end }) => {
                    const group = i18nGroups.find(({ key }) => key === keyword);
                    if (!group) {
                        return pre;
                    }

                    const offset = editor.document.offsetAt(deltaVisibleRange.start);
                    const range = new Range(editor.document.positionAt(begin + offset), editor.document.positionAt(end + offset));

                    if (processedRanges.some((processedRange) => !!range.intersection(processedRange)) || !range.isSingleLine) {
                        return pre;
                    }
                    processedRanges.push(range);

                    return [...pre, { ...group, range }];
                }, []);
        });

        editor.setDecorations(
            i18nKeyDecorationType,
            (await Hook.getInstance().matchI18n({ type: MatchType.Document, i18nGroups: matchedI18nGroups, document: editor.document })).reduce<DecorationOptions[]>((pre, cur) => {
                if (!cur.range) {
                    return pre;
                }

                const supportType = cur.supportType ?? SupportType.All;
                return [...pre, {
                    range: cur.range,
                    renderOptions: checkSupportType(SupportType.Decoration, supportType) ? genRenderOptions(cur) : void 0,
                    hoverMessage: checkSupportType(SupportType.HoverMessage, supportType) ? genHoverMessage(cur) : void 0,
                }]
            }, [])
        );
    }
    return asyncInvokeWithErrorHandler(handler);
}
