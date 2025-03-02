import type { Range } from 'vscode';
import type { MessageFormatElement } from '@formatjs/icu-messageformat-parser';

export type ConvertGroup = {
    matchedText: string;
    i18nValue: string;
    range?: Range;
    i18nKey?: string;
    customParam?: Record<string, any>;
    overwriteText?: string;
    documentText?: string;
    editingDocumentText?: string;
}

export type I18nGroup = {
    key: string;
    value: string;
    valueAST?: MessageFormatElement[];
    filePath?: string;
    line?: number;
}

export type I18nMap = Record<string, I18nGroup[]>;