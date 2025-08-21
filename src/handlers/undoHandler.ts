import localize from '@/utils/localize';
import { showMessage } from '@/utils/tips';
import { asyncInvokeWithErrorHandler } from '@/utils/error';
import { getLoading, FileSnapshotStack, writeFileByEditor } from '@/utils';

/**
 * 处理撤销操作
 * 恢复文件到上一个快照状态
 */
export const createUndoHandler = () => {
    const handler = async () => {
        if (getLoading()) {
            return showMessage('info', localize("handler.undo.loading.tip"));
        }

        const snapshotStack = FileSnapshotStack.getInstance();

        if (snapshotStack.isEmpty()) {
            return showMessage(
                'info', 
                localize("handler.undo.empty.tip", String(FileSnapshotStack.MAX_SIZE))
            );
        }

        const snapshotMap = snapshotStack.pop();
        if (!snapshotMap) {
            return;
        }

        for (const [uri, content] of snapshotMap.entries()) {
            await writeFileByEditor(uri, content, false, false);
        }
    };

    return asyncInvokeWithErrorHandler(handler);
};