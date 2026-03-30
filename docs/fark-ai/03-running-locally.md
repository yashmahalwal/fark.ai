# Running Locally

## 1) Configure `.env`

Copy the example file and fill in secrets:

```bash
cp .env.example .env
```

The local runner is `src/test-orchestrate.ts`, which reads these environment variables:

- `BACKEND_GITHUB_TOKEN`: token used for GitHub MCP calls against the backend repo
- `OPENAI_API_KEY`: used by all agents
- `BACKEND_OWNER`, `BACKEND_REPO`, `BACKEND_PR_NUMBER`: which PR to analyze
- `BACKEND_CODEBASE_PATH`: absolute path to the backend checkout on disk (the repo at the PR branch)
- `FRONTENDS`: JSON array of frontend configs, each with:
  - `repository: { owner, repo, branch }`
  - `codebasePath`: absolute path to the frontend checkout on disk

Optional:

- `GITHUB_MCP_SERVER_URL` (defaults to `https://api.githubcopilot.com/mcp/`)
- `LOG_LEVEL`
- per-agent limit overrides like `BE_ANALYZER_MAX_TOTAL_TOKENS`, etc.

## 2) Commands

```bash
# Build + run locally (bundles test runner and executes it)
npm run dev

# Debugger attached (inspect-brk)
npm run debug

# Typecheck only
npm run typecheck
```

## Bundling (what gets built)

Local runs build with `esbuild`:

- `src/index.ts` -> `dist/index.js` (action bundle)
- `src/test-orchestrate.ts` -> `dist/test-orchestrate.js` (local runner bundle)

So when debugging, you can set breakpoints in the original `src/` files and run the debug command to step through the compiled output.

## Minimal debugging example

If you want to inspect the step ordering or the concurrency behavior:

1. Put a breakpoint in `src/workflow/orchestrate.ts` inside `runFarkAnalysis()`.
2. Run `npm run debug`.
3. Verify:
   - Step 1 finishes with `backendChangesResult.batches`
   - Step 2 builds tasks for `(frontend × backendBatch)`
   - `p-limit` enforces the configured concurrency cap

