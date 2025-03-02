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
    const msg = `${error} ${error.stack} [${localize("error.feedback")}](${REPOSITORY_URL}/issues/new?title=${encodeURIComponent(error.toString().replace(/\(|\)|\[|\]/g, " "))})`;
    !cb && showMessage("error", msg, localize("error.close"));
    cb?.(error);
}