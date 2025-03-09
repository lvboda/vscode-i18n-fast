import type { Range } from 'vscode';
import type { MessageFormatElement } from '@formatjs/icu-messageformat-parser';

export type ConvertGroup = {
    i18nValue: string;
    matchedText?: string; 
    range?: Range; 
    i18nKey?: string;
    params?: Record<string, any>;
    overwriteText?: string;
    documentText?: string;
    editingDocumentText?: string;
    type?: 'ready' | 'new';
};

export type I18nGroup = {
    key: string;
    value: string;
    valueAST?: MessageFormatElement[];
    filePath?: string;
    line?: number;
}

export type I18nMap = Record<string, I18nGroup[]>;