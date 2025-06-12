export const enum MatchType {
    Document = 'document',
    /** TODO @see https://github.com/lvboda/vscode-i18n-fast/issues/1 */
    // Search = 'search',
}

export const enum SupportType {
    None = 0,
    Decoration = 1,
    HoverMessage = 2,
    Jump = 4,
    All = SupportType.Decoration|SupportType.HoverMessage|SupportType.Jump,
};

export const enum ConvertType {
    Exist = 'exist',
    New = 'new',
}

export const enum ConflictPolicy {
    Reuse = 'reuse',
    Ignore = 'ignore',
    Picker = 'picker',
    Smart = 'smart',
}
