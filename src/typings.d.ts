/** @description [originalText, realText, ?i18nKey] */
declare type MatchedGroup = [string, string] | [string, string, string];

declare type CustomParam = Record<string, any> | null | undefined;

/** @description [realText, customParam] */
declare type CustomParamGroup = [string, CustomParam];

declare module 'safe-eval' {
    function safeEval<T = any>(code: string, context: Record<string, any>): T;

    namespace safeEval {}
    export = safeEval;
}
