declare module 'safe-eval' {
    function safeEval<T = any>(code: string, context: Record<string, any>): T;

    namespace safeEval {}
    export = safeEval;
}