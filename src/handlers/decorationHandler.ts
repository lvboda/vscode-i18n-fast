import { window, workspace, Range, Uri, MarkdownString } from 'vscode';
import { flatMapDeep, isNil, max } from 'lodash';
import { match } from 'minimatch';
import { AhoCorasick } from '@monyone/aho-corasick';

import Hook from '../hook';
import I18n from '../i18n';
import { getConfig } from '../config';
import { PLUGIN_NAME } from '../constant';
import { asyncInvokeWithErrorHandler } from '../error';
import { 
    checkSupportType,
    AST2readableStr,
    AST2formattedStr,
    safeCall,
    truncateByDisplayWidth
} from '../utils';
import { MatchType, SupportType } from '../constant';
import { translationDecorationType } from './decorations';

import type { DecorationOptions } from 'vscode';
import type { I18nGroup } from '../types';

/**
 * 生成装饰器的渲染选项（显示翻译内容）
 */
const generateRenderOptions = (i18nGroup: I18nGroup) => {
    const { value, valueAST, renderOption } = i18nGroup;
    
    if (isNil(value) && isNil(valueAST)) {
        return undefined;
    }

    if (renderOption) {
        return renderOption;
    }

    const displayText = valueAST 
        ? safeCall(AST2readableStr, [valueAST], () => value)
        : value;

    return {
        after: {
            contentText: truncateByDisplayWidth(displayText)
        }
    };
}

/**
 * 生成悬停提示消息
 */
const generateHoverMessage = (i18nGroup: I18nGroup) => {
    const { value, valueAST, filePath, line, hoverMessage } = i18nGroup;

    if (isNil(value) && isNil(valueAST)) {
        return undefined;
    }

    if (hoverMessage) {
        return hoverMessage;
    }

    const markdown = new MarkdownString();
    markdown.appendMarkdown(`**[${PLUGIN_NAME}]**\n\n`);
    
    const codeContent = valueAST 
        ? safeCall(AST2formattedStr, [valueAST], () => value)
        : value;
    markdown.appendCodeblock(codeContent, 'plaintext');

    if (!isNil(filePath)) {
        const lineNumber = max([line, 0]) || 0;
        const relativePath = workspace.asRelativePath(filePath, false);
        const lineInfo = isNil(line) ? '' : `:${lineNumber}`;
        markdown.appendMarkdown(
            `[${relativePath}${lineInfo}](${Uri.parse(filePath)}#${lineNumber})`
        );
    }

    return markdown;
}

/**
 * 处理编辑器装饰（显示 i18n key 的翻译内容）
 * 在编辑器中找到所有 i18n key，并显示其对应的翻译
 */
export const createDecorationHandler = () => {
    const handler = async (editor = window.activeTextEditor) => {
        if (!editor?.document) return;

        const { i18nFilePattern } = getConfig();
        
        if (!i18nFilePattern || 
            !workspace.getWorkspaceFolder(editor.document.uri) ||
            match([workspace.asRelativePath(editor.document.uri, false)], i18nFilePattern).length > 0) {
            return;
        }

        const i18nEntries = I18n.getInstance().getI18nGroups();
        const processedRanges: Range[] = [];
        
        const matchedEntries = flatMapDeep(editor.visibleRanges, visibleRange => {
            const expandedRange = expandVisibleRange(visibleRange, editor.document.lineCount);
            return findI18nKeysInRange(
                editor.document,
                expandedRange,
                i18nEntries,
                processedRanges
            );
        });

        const filteredEntries = await Hook.getInstance().matchI18n({
            type: MatchType.Document,
            i18nGroups: matchedEntries,
            document: editor.document
        });

        const decorations = createDecorations(filteredEntries);
        editor.setDecorations(translationDecorationType, decorations);
    };

    return asyncInvokeWithErrorHandler(handler);
};

/**
 * 扩展可见区域范围
 */
const expandVisibleRange = (visibleRange: Range, maxLines: number): Range => {
    const { start, end } = visibleRange;
    const lineCount = end.line - start.line;
    
    const expandedStart = start.translate(
        Math.max(0, start.line - lineCount) - start.line
    );
    const expandedEnd = end.translate(
        Math.min(maxLines, end.line + lineCount) - end.line
    );
    
    return new Range(expandedStart, expandedEnd);
}

/**
 * 在指定范围内查找 i18n keys
 */
const findI18nKeysInRange = (
    document: any,
    range: Range,
    i18nEntries: I18nGroup[],
    processedRanges: Range[]
): I18nGroup[] => {
    const text = document.getText(range);
    const offset = document.offsetAt(range.start);
    
    const matcher = new AhoCorasick(i18nEntries.map(entry => entry.key));
    const matches = matcher
        .matchInText(text)
        .sort((a, b) => b.keyword.length - a.keyword.length);
    
    const results: I18nGroup[] = [];
    
    for (const { keyword, begin, end } of matches) {
        const entry = i18nEntries.find(e => e.key === keyword);
        if (!entry) continue;
        
        const matchRange = new Range(
            document.positionAt(begin + offset),
            document.positionAt(end + offset)
        );
        
        const hasOverlap = processedRanges.some(
            existing => !!matchRange.intersection(existing)
        );
        
        if (!hasOverlap && matchRange.isSingleLine) {
            processedRanges.push(matchRange);
            results.push({ ...entry, range: matchRange });
        }
    }
    
    return results;
}

/**
 * 创建装饰选项
 */
const createDecorations = (i18nEntries: I18nGroup[]): DecorationOptions[] => {
    return i18nEntries.reduce<DecorationOptions[]>((decorations, entry) => {
        if (!entry.range) return decorations;
        
        const supportType = entry.supportType ?? SupportType.All;
        
        decorations.push({
            range: entry.range,
            renderOptions: checkSupportType(SupportType.Decoration, supportType) 
                ? generateRenderOptions(entry) 
                : undefined,
            hoverMessage: checkSupportType(SupportType.HoverMessage, supportType) 
                ? generateHoverMessage(entry) 
                : undefined,
        });
        
        return decorations;
    }, []);
}