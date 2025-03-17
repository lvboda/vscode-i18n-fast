import localize from './localize';
import { showMessage } from './tips';
import { REPOSITORY_URL } from './constant';

type ErrorCallback = (error: Error) => any;

export function asyncInvokeWithErrorHandler<T extends (...args: any[]) => any>(fn: T, errorCallback?: ErrorCallback) {
    return async function (...args: Parameters<T>): Promise<ReturnType<T>> {
        let res;
        try {
            res = await fn(...args);
        } catch (err: any) {
            panic(err, errorCallback);
        }
        return res;
    };
}

export function invokeWithErrorHandler<T extends (...args: any[]) => any>(fn: T, errorCallback?: ErrorCallback) {
    return function (...args: Parameters<T>): ReturnType<T> {
        let res;
        try {
            res = fn(...args);
        } catch (err: any) {
            panic(err, errorCallback);
        }
        return res;
    };
}

export function panic(error: Error, cb?: ErrorCallback) {
    error.stack = String(error.stack);
    const msg = `${error.stack.length > 300 ? String(error.stack).slice(0, 300) + '...' : error.stack} [${localize("error.feedback")}](${REPOSITORY_URL}/issues/new?title=${encodeURIComponent(error.toString().replace(/\(|\)|\[|\]/g, " "))})`;
    !cb && showMessage('error', msg, void 0, localize("error.close"));
    cb?.(error);
}