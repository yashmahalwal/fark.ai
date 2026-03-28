"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PR_COMMENT_POSTER_DEFAULTS = exports.COMMENT_GENERATOR_DEFAULTS = exports.FRONTEND_FINDER_DEFAULTS = exports.BE_ANALYZER_DEFAULTS = void 0;
/**
 * Default step and token ceilings when callers do not override.
 * Kept low to minimize spend; increase via action inputs / env if runs truncate.
 */
exports.BE_ANALYZER_DEFAULTS = {
    maxSteps: 15,
    maxOutputTokens: 16384,
    maxTotalTokens: 100000,
};
exports.FRONTEND_FINDER_DEFAULTS = {
    maxSteps: 22,
    maxOutputTokens: 16384,
    maxTotalTokens: 150000,
};
exports.COMMENT_GENERATOR_DEFAULTS = {
    maxSteps: 12,
    maxOutputTokens: 8192,
    maxTotalTokens: 48000,
};
exports.PR_COMMENT_POSTER_DEFAULTS = {
    maxSteps: 45,
    maxOutputTokens: 8192,
    maxTotalTokens: 150000,
};
//# sourceMappingURL=agent-token-defaults.js.map