import type { Range, DecorationOptions, Definition, DefinitionLink } from 'vscode';
import type { MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import type { SupportType, ConvertType } from './enums';

export type ConvertGroup = {
    i18nValue: string;
    matchedText?: string; 
    range?: Range;
    i18nKey?: string;
    params?: Record<string, any>;
    overwriteText?: string;
    type?: ConvertType;
};

export type I18nGroup = {
    key: string;
    value: string;
    valueAST?: MessageFormatElement[];
    filePath?: string;
    line?: number;
    range?: Range;
    supportType?: SupportType;
    renderOption?: DecorationOptions['renderOptions'];
    hoverMessage?: DecorationOptions['hoverMessage'];
    locationLink?: Definition | DefinitionLink[];
};