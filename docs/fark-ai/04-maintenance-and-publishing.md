# Maintenance & Publishing

## Build + committed `dist/`

The GitHub Action entrypoint uses the bundled file in `dist/index.js`.

To ensure `dist/` stays up to date, a `husky` pre-push hook runs:

- `npm run build`
- stages `dist/`
- commits `dist/` if the build output changed

The action expects `dist/` to be committed, so you do not manually publish build artifacts.

## What to run in development

- `npm run build`: bundle production action code
- `npm run dev`: build the local runner bundle and execute it (`dist/test-orchestrate.js`)
- `npm run typecheck`: TypeScript type checking

## Agent limits (for large PRs)

If a PR is large and runs approach limits, you can raise per-agent ceilings using action inputs or environment variables:

- `be_analyzer_max_steps`
- `be_analyzer_max_output_tokens`
- `be_analyzer_max_total_tokens`
- `frontend_finder_max_*`
- `comment_generator_max_*`
- `pr_comment_poster_max_*`

These override the defaults in `src/constants/agent-token-defaults.ts` and flow into `calculateLimits()` / `enforceLimits()`.

