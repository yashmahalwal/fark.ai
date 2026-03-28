/**
 * Default step and token ceilings when callers do not override.
 * Kept low to minimize spend; increase via action inputs / env if runs truncate.
 */
export const BE_ANALYZER_DEFAULTS = {
  maxSteps: 15,
  maxOutputTokens: 16_384,
  maxTotalTokens: 100_000,
} as const;

export const FRONTEND_FINDER_DEFAULTS = {
  maxSteps: 22,
  maxOutputTokens: 16_384,
  maxTotalTokens: 150_000,
} as const;

export const COMMENT_GENERATOR_DEFAULTS = {
  maxSteps: 12,
  maxOutputTokens: 8_192,
  maxTotalTokens: 48_000,
} as const;

export const PR_COMMENT_POSTER_DEFAULTS = {
  maxSteps: 45,
  maxOutputTokens: 8_192,
  maxTotalTokens: 150_000,
} as const;
