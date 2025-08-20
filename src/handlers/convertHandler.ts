import { window, workspace, Range } from 'vscode';
import { groupBy, isNil } from 'lodash';

import Hook from '../hook';
import I18n from '../i18n';
import localize from '../localize';
import { getConfig } from '../config';
import { asyncInvokeWithErrorHandler } from '../error';
import { conflictDecorationType } from './decorations';
import { 
    FileSnapshotStack, 
    asyncMap,
    matchChinese 
} from '../utils';
import { ConflictPolicy, ConvertType } from '../constant';

import type { TextDocument } from 'vscode';
import type { ConvertGroup, I18nGroup } from '../types';

const PICKER_ACTION = {
    IGNORE: Symbol('ignore'),
    SKIP: Symbol('skip')
} as const;

/**
 * 显示 i18n key 选择器，让用户选择使用哪个已存在的 key
 */
const showI18nKeyPicker = async (existingEntries: I18nGroup[]): Promise<symbol | string | undefined> => {
    const quickPickItems = [
        ...existingEntries.map(({ key, filePath, line }) => ({
            key,
            label: localize("handler.use", key),
            description: filePath 
                ? `${workspace.asRelativePath(filePath, false)}${isNil(line) ? '' : `:${line}`}` 
                : ''
        })),
        {
            key: PICKER_ACTION.IGNORE,
            label: localize("handler.ignore")
        },
        {
            key: PICKER_ACTION.SKIP,
            label: localize("handler.skip")
        }
    ];

    const result = await window.showQuickPick(quickPickItems, {
        placeHolder: localize("handler.conflict.tip", 
            String(existingEntries.length), 
            existingEntries[0].value
        ),
    });

    return result?.key;
}

/**
 * 收集需要转换的文案组
 * 优先级: 参数 > 选中文本 > 自定义匹配 > 中文匹配
 */
const collectTextToConvert = async (
    document: TextDocument,
    providedGroups?: ConvertGroup[]
): Promise<ConvertGroup[]> => {
    const editor = window.activeTextEditor;
    if (!editor) return [];

    if (providedGroups?.length) {
        return providedGroups;
    }

    const selectionsGroups = editor.selections.reduce<ConvertGroup[]>((groups, selection) => {
        const text = document.getText(selection);
        if (!selection.isEmpty && text) {
            groups.push({ 
                i18nValue: text, 
                range: selection 
            });
        }
        return groups;
    }, []);

    if (selectionsGroups.length) {
        return selectionsGroups;
    }

    const matchedGroups: ConvertGroup[] = [];
    matchedGroups.push(...await Hook.getInstance().match({ document }));
    
    if (getConfig().autoMatchChinese) {
        matchedGroups.push(...matchChinese(document));
    }

    return matchedGroups;
}

/**
 * 查找文本在文档中的位置
 */
const findTextRangeInDocument = (
    text: string,
    documentText: string,
    document: TextDocument,
    excludedRanges: Range[]
): Range | undefined => {
    let index = documentText.indexOf(text);
    
    while (index !== -1) {
        const range = new Range(
            document.positionAt(index),
            document.positionAt(index + text.length)
        );

        const hasOverlap = excludedRanges.some(
            existingRange => !!range.intersection(existingRange)
        );

        if (!hasOverlap) {
            return range;
        }

        index = documentText.indexOf(text, index + text.length);
    }

    return undefined;
}

/**
 * 显示冲突装饰并等待用户选择
 */
const highlightConflictsAndWaitForChoice = async (
    editor: any,
    groups: ConvertGroup[],
    existingEntries: I18nGroup[]
): Promise<symbol | string | undefined> => {
    const validGroups = groups.filter(g => g.range);
    if (!validGroups.length) return;

    const firstRange = validGroups[0].range!;
    editor.revealRange(firstRange);

    const decorations = validGroups.map(group => ({
        range: group.range!,
        renderOptions: group.range!.start.isEqual(group.range!.end) 
            ? { 
                after: { 
                    contentText: '', 
                    width: '10px', 
                    height: '100%', 
                    backgroundColor: 'rgba(255, 0, 0, 0.5)' 
                } 
            }
            : undefined
    }));

    editor.setDecorations(conflictDecorationType, decorations);
    const selectedKey = await showI18nKeyPicker(existingEntries);
    editor.setDecorations(conflictDecorationType, []);

    return selectedKey;
}

/**
 * 根据冲突策略处理文案组
 */
const resolveConflictsByPolicy = async (
    groups: ConvertGroup[],
    existingEntries: I18nGroup[],
    policy: ConflictPolicy,
    editor: any
): Promise<ConvertGroup[]> => {
    switch (policy) {
        case ConflictPolicy.Ignore:
            return groups;

        case ConflictPolicy.Reuse:
            return groups.map(group => ({
                ...group,
                i18nKey: existingEntries[0].key,
                type: ConvertType.Exist
            }));

        case ConflictPolicy.Smart:
            if (existingEntries.length === 1) {
                return groups.map(group => ({
                    ...group,
                    i18nKey: existingEntries[0].key,
                    type: ConvertType.Exist
                }));
            }
            // fallthrough

        case ConflictPolicy.Picker:
            const selectedKey = await highlightConflictsAndWaitForChoice(
                editor, 
                groups, 
                existingEntries
            );

            if (selectedKey === PICKER_ACTION.SKIP) {
                return [];
            }

            if (selectedKey === PICKER_ACTION.IGNORE) {
                return groups.map(group => ({
                    ...group,
                    type: ConvertType.New
                }));
            }

            return groups.map(group => ({
                ...group,
                i18nKey: String(selectedKey) || group.i18nKey,
                type: ConvertType.Exist
            }));

        default:
            return groups;
    }
}

/**
 * 处理文本到 i18n key 的转换
 * 这是插件的核心功能，负责：
 * 1. 收集需要转换的文本
 * 2. 处理相同文本的去重
 * 3. 解决 i18n key 冲突
 * 4. 调用 hook 执行转换和写入
 */
export const createConvertHandler = () => {
    const handler = async (providedGroups?: ConvertGroup[]) => {
        const editor = window.activeTextEditor;
        if (!editor) return;

        FileSnapshotStack.getInstance().next();
        
        const document = editor.document;
        const documentText = document.getText();
        const { conflictPolicy } = getConfig();

        let convertGroups = await collectTextToConvert(document, providedGroups);
        
        if (convertGroups.every(({ i18nValue }) => !i18nValue.trim())) {
            return;
        }

        const existingI18nEntries = I18n.getInstance().getI18nGroups();
        const processedRanges: Range[] = [];

        const groupedByText = groupBy(convertGroups, 'i18nValue');
        
        convertGroups = (await asyncMap(
            Object.entries(groupedByText),
            async ([text, groups]) => {
                const existingMatches = existingI18nEntries.filter(
                    entry => entry.value === text
                );

                const processedGroups = groups.map(group => {
                    group.type = ConvertType.New;

                    if (!group.range && group.matchedText) {
                        const foundRange = findTextRangeInDocument(
                            group.matchedText,
                            documentText,
                            document,
                            processedRanges
                        );
                        
                        if (foundRange) {
                            processedRanges.push(foundRange);
                            group.range = foundRange;
                        }
                    }

                    return group;
                });

                if (!existingMatches.length || processedGroups.every(g => !g.range)) {
                    return processedGroups;
                }

                return resolveConflictsByPolicy(
                    processedGroups,
                    existingMatches,
                    conflictPolicy,
                    editor
                );
            }
        )).flat();

        convertGroups = await Hook.getInstance().convert({ convertGroups, document });
        await Hook.getInstance().write({ convertGroups, document });
    };

    return asyncInvokeWithErrorHandler(handler);
};