import { workspace } from "vscode";

import { PLUGIN_NAME } from "./constant";

import type { WorkspaceConfiguration } from "vscode";

const defaultConfig = {
    hookFilePattern: '**/test.i18n-fast.hook.js',
    i18nFilePattern: '**/locales/**/*.js',
    autoMatchChinese: true,
    matchExpr: '',
    customParamExpr: '',
    i18nKeyExpr: '',
    codeOverwriteExpr: '',
    i18nFilePathExpr: '',
    i18nFileOverwriteExpr: '',
};

function genConfig(config: WorkspaceConfiguration) {
    return Object.entries(defaultConfig).reduce((pre, [key]) => {
        return { ...pre, [key]: config.get(key) };
    }, defaultConfig);
}

export function getConfig() {
    return genConfig(workspace.getConfiguration(PLUGIN_NAME));
}
