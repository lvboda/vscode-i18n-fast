import { workspace } from "vscode";

import { PLUGIN_NAME } from "./constant";

import type { WorkspaceConfiguration } from "vscode";

const defaultConfig = {
    hookFilePath: '',
    autoMatchChinese: true,
    matchExpr: "[...documentText.matchAll(/%(.+?)%/g).map((arr) => arr?.[1]).filter(Boolean)]",
    customParamExpr: "",
    i18nKeyExpr: "",
    codeOverwriteExpr: "",
    i18nFilePathExpr: "",
    i18nFileOverwriteExpr: "",
};

function genConfig(config: WorkspaceConfiguration) {
    return Object.entries(defaultConfig).reduce((pre, [key]) => {
        return { ...pre, [key]: config.get(key) };
    }, defaultConfig);
}

export function getConfig() {
    return genConfig(workspace.getConfiguration(PLUGIN_NAME));
}
