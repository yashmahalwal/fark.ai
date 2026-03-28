/**
 * Default step and token ceilings when callers do not override.
 * Kept low to minimize spend; increase via action inputs / env if runs truncate.
 */
export declare const BE_ANALYZER_DEFAULTS: {
    readonly maxSteps: 15;
    readonly maxOutputTokens: 16384;
    readonly maxTotalTokens: 100000;
};
export declare const FRONTEND_FINDER_DEFAULTS: {
    readonly maxSteps: 22;
    readonly maxOutputTokens: 16384;
    readonly maxTotalTokens: 150000;
};
export declare const COMMENT_GENERATOR_DEFAULTS: {
    readonly maxSteps: 12;
    readonly maxOutputTokens: 8192;
    readonly maxTotalTokens: 48000;
};
export declare const PR_COMMENT_POSTER_DEFAULTS: {
    readonly maxSteps: 45;
    readonly maxOutputTokens: 8192;
    readonly maxTotalTokens: 150000;
};
//# sourceMappingURL=agent-token-defaults.d.ts.map