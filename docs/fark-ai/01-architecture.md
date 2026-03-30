# Architecture & Agents

The `fark.ai` GitHub Action analyzes a backend pull request for breaking API interface changes, scans checked-out frontend repositories for breakages, and then posts inline PR review comments.

## High-level pipeline

```mermaid
flowchart TD
  A[GitHub Actions job triggers on PR] --> B[Step 1: BE Diff Analyzer]
  B --> C[Backend breaking-change batches (JSON)]
  C --> D[Step 2: Frontend Impact Finder (per frontend × batch)]
  D --> E[Frontend impacts grouped by batch + changeId]
  E --> F[Step 5: PR Comment Generator]
  F --> G[Step 6: PR Comment Poster]
  G --> H[Draft review + inline comments submitted]
```

## Entry point + orchestration

The runtime entrypoint is `src/index.ts`. It:

1. Reads action inputs (backend PR target, frontend repos list, `OPENAI_API_KEY`, MCP server URL, optional agent limits).
2. Builds the `OrchestrateInput` object.
3. Calls `runFarkAnalysis()` from `src/workflow/orchestrate.ts`.

`runFarkAnalysis()` runs the pipeline steps in order, with concurrency for the frontend scan step:

- Step 1: `analyzeBackendDiff()` (BE Analyzer)
- Step 2: `findFrontendImpacts()` (Frontend Finder), executed as parallel tasks with a concurrency cap
- Step 3/4: group results by `backendBatchId` then `backendChangeId`
- Step 5: `generatePRComments()` (Comment Generator)
- Step 6: `postPRComments()` (PR Comment Poster)

## Agents (what each one does)

### Agent 1: BE Diff Analyzer (`src/agents/be-analyzer.ts`)

Goal: identify breaking API interface changes by analyzing the backend PR diff.

How it works (in practice):

- Uses GitHub MCP tools for PR operations (diff/PR metadata).
- Reads backend source from the checked-out codebase using read-only filesystem tools.
- Enforces a structured output shape (`backendChangesSchema`) so later steps can reliably anchor comments to diff line ranges.

Important behavior:

- It is designed to focus on API-surface changes, not internal-only refactors.
- It relies heavily on diff first, and only reads additional source sections when needed.

### Agent 2: Frontend Impact Finder (`src/agents/frontend-finder.ts`)

Goal: determine where backend changes will break frontend code.

How it works:

- Runs against each checked-out frontend repo.
- Receives one backend batch at a time (so the scan set matches the comment generator’s granularity).
- Uses filesystem tools only (`readFile` + `bash`) against the checked-out repo on disk.
- Produces structured results (`frontendImpactsSchema`) that include:
  - which backend batch/change they relate to (`backendBatchId`, `backendChangeId`)
  - the frontend file and the specific “API element” to look at (`file`, `apiElement`)
  - severity classification (`severity`)

Concurrency:

- `runFarkAnalysis()` creates tasks for every `(frontend × backendBatch)` combination and runs them with `p-limit` capped by `frontend_finder_concurrency_limit` (default 5).

### Agent 3: PR Comment Generator (`src/agents/comment-generator.ts`)

Goal: turn backend changes + frontend impacts into concrete inline PR review comments.

How it works:

- Takes the flattened list of backend changes (each includes its `frontendImpacts`).
- Uses a structured output schema so comments are generated in the correct array order and anchored to the exact diff hunk line metadata (path + start/end line + LEFT/RIGHT sides).

Note:

- This agent does not call repository tools; it only generates comment payloads from the provided JSON.

### Agent 4: PR Comment Poster (`src/agents/pr-comment-poster.ts`)

Goal: create a draft review on the backend PR and add the inline comments.

How it works:

- Uses GitHub MCP tools to:
  - read PR metadata (`pull_request_read`)
  - create/submit a draft review (`pull_request_review_write`)
  - add inline comments (`add_comment_to_pending_review`)
- Wraps `pull_request_review_write` to handle the `event` parameter so draft creation is reliable:
  - for `method="create"` it omits `event`
  - for `method="submit_pending"` it allows the `event` needed for submission

It’s robust to partial failures:

- Inline posting failures are collected into a top-level review body section (`## Could not post as inline comments`).

## Data passing (the “contracts” between steps)

Each agent returns JSON that is validated by Zod schemas inside the agent (orchestrator also validates inputs with Zod). The key rule is:

- The schemas ensure later steps can rely on stable IDs (`batchId`, `change.id`) and stable diff anchor metadata (`path`, `startLine/endLine`, `startSide/endSide`).

