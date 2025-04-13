import { workspace } from 'vscode';

import { PLUGIN_NAME } from "./constant";
import { ConflictPolicy } from './types/enums';

import type { WorkspaceConfiguration } from "vscode";

// package.json ignore
// "i18n-fast.autoMatchChinese": {
//     "description": "%package.configuration.autoMatchChinese%",
//     "type": "boolean",
//     "default": true
// },

type Config = {
    hookFilePattern: string;
    i18nFilePattern: string;
    autoMatchChinese: boolean;
    conflictPolicy: ConflictPolicy;
}

const defaultConfig: Config = {
    hookFilePattern: '.vscode/i18n-fast.hook.js',
    i18nFilePattern: '',
    autoMatchChinese: true,
    conflictPolicy: ConflictPolicy.Smart,
};

const genConfig = (config: WorkspaceConfiguration) => {
    return Object.entries(defaultConfig).reduce((pre, [key]) => {
        return { ...pre, [key]: config.get(key) };
    }, defaultConfig);
}

export const getConfig = () => {
    return genConfig(workspace.getConfiguration(PLUGIN_NAME));
}