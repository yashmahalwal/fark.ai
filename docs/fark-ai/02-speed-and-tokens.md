# Speed & Token Strategy

This action is intentionally token-aware. It tries to minimize:

- how much code is read into the model context
- how many tool calls are made
- total steps and total tokens per agent run

## Where limits are applied

Each agent calls `calculateLimits()` (defaults from `src/constants/agent-token-defaults.ts`) and then uses `enforceLimits()` during `generateText()`:

- `stopWhen: stepCountIs(MAX_STEPS)` caps steps
- `maxOutputTokens: MAX_OUTPUT_TOKENS` caps model output size
- `enforceLimits()` watches accumulated tokens and changes behavior:
  - at >= 85% budget: inject a “wrap up soon” nudge (tools still allowed)
  - at >= 100% budget: stop tool usage and force final JSON
  - if usage is critical (>= ~125%): abort with an error
  - at the step-limit boundary: force output generation if no structured output exists yet

## Token enforcement flow

```mermaid
flowchart TD
  A[Start agent run] --> B[generateText + tools allowed]
  B --> C{Tokens >= 85%?}
  C -- No --> B
  C -- Yes --> D[Inject wrap-up nudge (tools remain enabled)]
  D --> E{Tokens >= MAX_TOTAL?}
  E -- No --> D
  E -- Yes --> F[Force final structured JSON; stop further tool calls]
  F --> G{Critical exceed (~125%)?}
  G -- Yes --> H[Abort with error]
  G -- No --> I[Return structured output]
```

## Speed: batches + parallelization

### Batches

Step 1 (BE Analyzer) returns `batches[]`. These batches group related breaking changes together.

Step 2 (Frontend Finder) runs once per `(frontend, batch)` pair:

- This keeps the frontend scan scope aligned with comment-generation granularity.
- It also avoids re-running the whole frontend scan for every single change.

### Parallelization with a concurrency cap

`runFarkAnalysis()` creates tasks for every `(frontend × backendBatch)` combination, then runs them with `p-limit(concurrencyLimit)`.

The cap is controlled by:

- action input: `frontend_finder_concurrency_limit`
- env fallback: `FRONTEND_FINDER_CONCURRENCY_LIMIT`
- default: `5`

## Speed: limiting data access

The agents’ prompts include strict “data access” constraints so they do not load unnecessary repository data:

- Use PR diff first; only read more when you cannot confirm impact from diff alone.
- Prefer reading small, relevant sections via `bash` (and bounded `sed`/range reads), not whole files.
- Avoid inventory-style directory walking (`find`, repeated `ls`) unless it’s genuinely needed to pick good search roots.
- The filesystem tools mount the codebase read-only via an overlay FS, so the action reads from the checked-out workspace but does not “clone” internally.

