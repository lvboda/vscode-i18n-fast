export const PLUGIN_PUBLISHER = "lvboda";

export const PLUGIN_FULL_NAME = "vscode-i18n-fast";

export const PLUGIN_NAME = "i18n-fast";

export const COMMAND_CONVERT_KEY = `${PLUGIN_NAME}.convert`;

export const COMMAND_PASTE_KEY = `${PLUGIN_NAME}.paste`;

export const COMMAND_UNDO_KEY = `${PLUGIN_NAME}.undo`;

export const REPOSITORY_URL = "https://github.com/lvboda/vscode-i18n-fast";

export const FILE_IGNORE = "{**/node_modules/**, **/.git/**, **/@types/**, **/.vscode/**, **.d.ts, **/.history/**}";

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
}

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

export const enum WatchState {
    Change = 'change',
    Create = 'create',
    Delete = 'delete',
}
