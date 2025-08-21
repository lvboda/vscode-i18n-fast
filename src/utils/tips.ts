import { window, MarkdownString } from 'vscode';

import { PLUGIN_NAME } from '@/utils/constant';

function genMessage(message: string, maxLength?: number) {
    return `[${PLUGIN_NAME}] ${maxLength ? (message.length > maxLength ? message.slice(0, maxLength) + '...' : message) : message}`;
}

const globalStatusBar = window.createStatusBarItem();

export function showStatusBar(message: string, tooltip?: string) {
    globalStatusBar.tooltip = new MarkdownString(tooltip);
    globalStatusBar.text = genMessage(message);
    globalStatusBar.show();
}

export function hideStatusBar() {
    globalStatusBar.hide();
}

export function showMessage(type: "info" | "warn" | "error" = "info", message: string, maxLength = 300, ...args: string[]) {
    switch (type) {
        case "info":
            window.showInformationMessage(genMessage(message, maxLength), ...args);
            break;
        case "warn":
            window.showWarningMessage(genMessage(message, maxLength), ...args);
            break;
        case "error":
            window.showErrorMessage(genMessage(message, maxLength), ...args);
            break;
    }
}