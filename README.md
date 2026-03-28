# fark-ai

GitHub Action that looks at a **backend pull request**, finds **breaking API changes**, checks **one or more frontend codebases** for where those changes would break clients, then leaves a **draft PR review** with **inline comments** on the backend PR.

---

## Table of contents

- [What is fark-ai?](#what-is-fark-ai)
- [What you get](#what-you-get)
- [How it works (step by step)](#how-it-works-step-by-step)
- [What you need first](#what-you-need-first)
- [Add the action to your backend repository](#add-the-action-to-your-backend-repository)
- [Example: backend PR workflow with extra frontends checked out](#example-backend-pr-workflow-with-extra-frontends-checked-out)
- [Example: same repo (monorepo) layout](#example-same-repo-monorepo-layout)
- [Secrets](#secrets)
- [Inputs (full list)](#inputs-full-list)
- [Outputs](#outputs)
- [The `frontends` setting (JSON)](#the-frontends-setting-json)
- [Paths on the runner](#paths-on-the-runner)
- [GitHub MCP URL](#github-mcp-url)
- [Optional: tune token and step limits](#optional-tune-token-and-step-limits)
- [Default limits (reference)](#default-limits-reference)
- [Pointing `uses:` at this repository](#pointing-uses-at-this-repository)
- [Building and shipping `dist/` (maintainers)](#building-and-shipping-dist-maintainers)
- [Run locally (developers)](#run-locally-developers)
- [Troubleshooting](#troubleshooting)
- [Project layout](#project-layout)
- [License](#license)

---

## What is fark-ai?

It is a **composite-style JavaScript action** (runs on **Node 20**). You run it from a workflow, usually when someone opens or updates a **pull request** on your **backend** repo. It talks to **OpenAI** and to **GitHub** through the **GitHub MCP** endpoint you configure (default is GitHub’s Copilot MCP URL).

You must give it:

- Paths on disk to the **backend** repo (the PR branch checkout).
- Paths on disk to each **frontend** repo (or folder), already checked out at the branch you care about.
- A **GitHub token** that can use MCP for that backend PR, and an **OpenAI API key**.

---

## What you get

- A **summary** of breaking API-style changes inferred from the backend PR.
- **Frontend impact** lines tied to those changes (per frontend repo you listed).
- A **submitted or pending review** on the backend PR with **one inline thread per diff hunk** the tool was given (see your comment-generator behavior in code for exact rules).
- **Job outputs** you can use in later steps: counts of changes, impacts, and comments.

---

## How it works (step by step)

1. **Backend analyzer** – Reads the PR (via MCP) and the backend tree on disk. Outputs structured “breaking change” items grouped in batches.
2. **Frontend finder** – For each frontend you configured, and for each batch, searches that frontend codebase for real breakages. Runs with a **concurrency limit** so you do not start too many jobs at once.
3. **Comment generator** – Builds markdown for a review **summary** and **per-line comments** from the merged results.
4. **PR comment poster** – Creates a **pending review**, adds **inline comments**, then **submits** the review via MCP.

If any step fails, check logs: each stage logs under its own name (for example `Orchestrate`, `PR Comment Poster`).

---

## What you need first

| Need | Why |
|------|-----|
| **Backend checkout** on the runner | The action reads source files from disk (not only the diff text). |
| **Frontend checkouts** on the runner | Same: search happens in those folders. |
| **`backend_github_token` secret** | Used for GitHub MCP (PR read, review write, etc.). Must be allowed to do those operations on the **backend** repo. |
| **`openai_api_key` secret** | All LLM steps use OpenAI. |
| **`dist/` present on the git ref you `uses:`** | `action.yml` runs `dist/index.js`. This repo’s **Release / Build** workflow builds and commits `dist/` on pushes to the default branch (see [Building and shipping `dist/`](#building-and-shipping-dist-maintainers)). |

---

## Add the action to your backend repository

1. Put a workflow file under `.github/workflows/` (for example `fark-ai.yml`).
2. Trigger on `pull_request` (or `pull_request_target` if you know the risks and need it).
3. **Check out the backend** (usually the default checkout for that repo).
4. **Check out each frontend** into a folder under `github.workspace` (or use absolute paths if you really want).
5. Call **`uses: <owner>/<repo>@<ref>`** with the inputs below.
6. Add **secrets** in the backend repo settings.

---

## Example: backend PR workflow with extra frontends checked out

This pattern fits when the backend is **this** repo’s PR, and frontends live in **other** repos. You need a token that can **read** those repos (often the same PAT you pass as `backend_github_token` if it has org/repo access).

```yaml
name: Breaking API check

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  fark-ai:
    runs-on: ubuntu-latest
    steps:
      # Backend PR branch (default workspace)
      - name: Checkout backend
        uses: actions/checkout@v4

      - name: Checkout frontend web
        uses: actions/checkout@v4
        with:
          repository: my-org/my-web-app
          ref: main
          path: frontends/web
          token: ${{ secrets.FARK_GITHUB_TOKEN }}

      - name: Checkout mobile app
        uses: actions/checkout@v4
        with:
          repository: my-org/my-mobile-app
          ref: main
          path: frontends/mobile
          token: ${{ secrets.FARK_GITHUB_TOKEN }}

      - name: Run fark-ai
        uses: my-org/fark-ai@main
        with:
          backend_github_token: ${{ secrets.FARK_GITHUB_TOKEN }}
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          backend_owner: ${{ github.repository_owner }}
          backend_repo: ${{ github.event.repository.name }}
          # PR number: omit on pull_request events and the action uses the event PR
          backend_codebase_path: ${{ github.workspace }}
          frontends: |
            [
              {
                "repository": { "owner": "my-org", "repo": "my-web-app", "branch": "main" },
                "codebasePath": "frontends/web"
              },
              {
                "repository": { "owner": "my-org", "repo": "my-mobile-app", "branch": "main" },
                "codebasePath": "frontends/mobile"
              }
            ]
          log_level: info
```

Notes:

- Replace `my-org`, repo names, branch names, and `uses: my-org/fark-ai@main` with yours.
- Pin `@v1` or a **commit SHA** instead of `@main` when you want stable behavior.
- `codebasePath` values are **relative to `GITHUB_WORKSPACE`** unless they start with `/`.

---

## Example: same repo (monorepo) layout

If backend and frontends are **folders inside one checkout**:

```yaml
on:
  pull_request:

jobs:
  fark-ai:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: my-org/fark-ai@main
        with:
          backend_github_token: ${{ secrets.FARK_GITHUB_TOKEN }}
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          backend_owner: ${{ github.repository_owner }}
          backend_repo: ${{ github.event.repository.name }}
          backend_codebase_path: ${{ github.workspace }}/services/api
          frontends: |
            [
              {
                "repository": { "owner": "my-org", "repo": "my-monorepo", "branch": "main" },
                "codebasePath": "apps/web"
              }
            ]
```

Here `apps/web` is relative to the workspace root (the repo root after checkout).

---

## Secrets

| Secret (example name) | Maps to input | Notes |
|------------------------|---------------|--------|
| `OPENAI_API_KEY` | `openai_api_key` | Create in OpenAI dashboard. |
| `FARK_GITHUB_TOKEN` (or any name you choose) | `backend_github_token` | **Personal access token** or **fine-grained PAT** with rights to use GitHub MCP against the **backend** repo and to read/write what MCP needs (PR, reviews). If you checkout other repos, that token must be able to read them too. |

**Do not** commit secrets. Use **GitHub Actions secrets** only.

---

## Inputs (full list)

| Input | Required | Default | What it does |
|-------|----------|---------|----------------|
| `backend_github_token` | Yes | — | Token for GitHub MCP (backend PR operations). |
| `openai_api_key` | Yes | — | OpenAI key for all agents. |
| `github_mcp_server_url` | No | `https://api.githubcopilot.com/mcp/` | MCP base URL. |
| `backend_owner` | Yes | — | GitHub owner/org of the **backend** repo. |
| `backend_repo` | Yes | — | Backend repo name (without owner). |
| `backend_pr_number` | No | PR from `github.context` when available | Which PR to analyze. Required if the workflow is not a `pull_request` event with a PR in context. |
| `backend_codebase_path` | No | `github.workspace` | Folder where the backend code lives on the runner. |
| `frontends` | Yes | — | JSON array (string). See [The `frontends` setting (JSON)](#the-frontends-setting-json). |
| `log_level` | No | `info` | `fatal` \| `error` \| `warn` \| `info` \| `debug` \| `trace` |
| `be_analyzer_max_steps` | No | (see [defaults](#default-limits-reference)) | Cap model steps for backend analyzer. |
| `be_analyzer_max_output_tokens` | No | | Cap output tokens per step (analyzer). |
| `be_analyzer_max_total_tokens` | No | | Cap **input+output** tokens for that agent run. |
| `frontend_finder_max_steps` | No | | Applied to **every** frontend (merged with per-frontend `options` in JSON if you add them). |
| `frontend_finder_max_output_tokens` | No | | Same. |
| `frontend_finder_max_total_tokens` | No | | Same. |
| `frontend_finder_concurrency_limit` | No | `5` | Max parallel frontend×batch tasks. |
| `comment_generator_max_steps` | No | | Comment generator limits. |
| `comment_generator_max_output_tokens` | No | | |
| `comment_generator_max_total_tokens` | No | | |
| `pr_comment_poster_max_steps` | No | | Poster limits (many inline comments need higher totals). |
| `pr_comment_poster_max_output_tokens` | No | | |
| `pr_comment_poster_max_total_tokens` | No | | |

---

## Outputs

| Output | Type | Meaning |
|--------|------|---------|
| `changes_count` | string (number) | Backend breaking-change items after the pipeline merged them for commenting. |
| `impacts_count` | string (number) | Total frontend impact rows attached across those changes. |
| `comments_count` | string (number) | Length of the generated comments list passed to the poster (one entry per planned inline comment). |

Use them in later steps with `${{ steps.<step-id>.outputs.changes_count }}` (name your step `id:`).

---

## The `frontends` setting (JSON)

`frontends` must be a **JSON array**. Each element is one frontend codebase to search.

**Required fields per element**

- `repository.owner`, `repository.repo`, `repository.branch` – Identify the repo (for labels in comments; branch is the branch you expect checked out at `codebasePath`).
- `codebasePath` – Directory on the runner that already contains that checkout.

**Optional fields per element**

- `options` – Same shape as the action’s limit inputs, for **this** frontend only: `maxSteps`, `maxOutputTokens`, `maxTotalTokens`. If you set both action inputs (`frontend_finder_max_*`) and `options`, **per-frontend fields override** the matching action-level field.

**Minimal shape**

```json
[
  {
    "repository": { "owner": "my-org", "repo": "my-app", "branch": "main" },
    "codebasePath": "frontends/web"
  }
]
```

In YAML, pass it as a **block scalar** after `frontends: |` so the JSON can span lines (see examples above).

---

## Paths on the runner

- **`backend_codebase_path`** and each **`codebasePath`** must exist **before** the action runs.
- If a path does **not** start with `/`, the action joins it with **`GITHUB_WORKSPACE`**.
- Typical layout: one `actions/checkout` for backend at `.`, more checkouts with `path: frontends/foo`, then `codebasePath: frontends/foo`.

---

## GitHub MCP URL

- Input: `github_mcp_server_url`.
- If you leave it empty, the action uses **`https://api.githubcopilot.com/mcp/`** (same as `action.yml` default).
- Your token must be valid for whatever MCP server you point at.

---

## Optional: tune token and step limits

Raise limits when logs show:

- “token limit” or “step limit” warnings,
- truncated reviews,
- or “could not submit” near budget caps.

You can set only the knobs you need; others stay at [defaults](#default-limits-reference).

**Example**

```yaml
with:
  # ...required inputs...
  pr_comment_poster_max_total_tokens: '200000'
  frontend_finder_max_total_tokens: '300000'
  frontend_finder_concurrency_limit: '3'
```

Use **strings** for numeric inputs in YAML (GitHub passes them as strings; the action parses them).

---

## Default limits (reference)

These match `src/constants/agent-token-defaults.ts` when you do **not** pass overrides.

| Agent | max steps | max output tokens | max total tokens |
|-------|-----------|-------------------|------------------|
| BE analyzer | 15 | 16_384 | 100_000 |
| Frontend finder | 22 | 16_384 | 150_000 |
| Comment generator | 12 | 8_192 | 48_000 |
| PR comment poster | 45 | 8_192 | 150_000 |

**Concurrency** (frontend jobs): **5** if you do not set `frontend_finder_concurrency_limit` or env `FRONTEND_FINDER_CONCURRENCY_LIMIT` in orchestration.

---

## Pointing `uses:` at this repository

Examples:

```yaml
uses: my-org/fark-ai@main          # latest on default branch (ensure dist/ is committed)
uses: my-org/fark-ai@v1           # tag (recommended for production)
uses: my-org/fark-ai@abc1234      # full commit SHA (most reproducible)
```

This repo keeps **`src/`** in git; **`action.yml`** entrypoint is **`dist/index.js`**. Consumers need a ref where **`dist/` exists**.

---

## Building and shipping `dist/` (maintainers)

1. **Workflow `Release / Build`** (`.github/workflows/release-build.yml`):
   - On **pull requests** to `main`: runs `npm ci` and `npm run build` and checks `dist/index.js` exists (no push).
   - On **push** to the **default branch** (and on **workflow_dispatch** on that branch): same build, then **commits and pushes** `dist/` if it changed (`git add -f dist` because `dist/` is gitignored for local dev).

2. **Repository setting**: **Settings → Actions → General → Workflow permissions** → allow **Read and write** so `GITHUB_TOKEN` can push the `dist/` commit.

3. **Branch protection**: If bots cannot push to `main`, either allow **github-actions[bot]** or merge `dist/` updates via PR.

4. **Local**: `npm ci && npm run build` produces `dist/`; you can commit with `git add -f dist` if needed.

---

## Run locally (developers)

1. Copy **`.env.example`** to **`.env`** and fill values (see comments inside).
2. Install: `npm ci`
3. Run the orchestration script: `npm run test:orchestrate`

That script reads env vars (backend repo, PR number, `FRONTENDS` JSON, tokens, optional limit vars). It calls the same `runFarkAnalysis` as the GitHub Action.

Other scripts:

- `npm run build` – compile TypeScript to `dist/`.
- `npm run typecheck` – typecheck only.
- `npm test` – unit tests (CI runs this too).

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| `Cannot find module` / missing `dist/index.js` | The ref you `uses:` must include a built **`dist/`**. Run **Release / Build** or build locally and commit `dist/`. |
| MCP or GitHub errors | `backend_github_token` scopes and `github_mcp_server_url`. |
| OpenAI errors | `openai_api_key`, quota, and model availability. |
| Empty or tiny comments | Comment generator and poster logs; raise [limits](#optional-tune-token-and-step-limits) if runs stop early on token caps. |
| Frontends not found | `codebasePath` must exist on disk; fix checkout steps or paths. |
| Wrong PR analyzed | Set `backend_pr_number` explicitly for non-`pull_request` workflows. |

---

## Project layout

| Path | Role |
|------|------|
| `action.yml` | Action metadata and inputs/outputs. |
| `dist/index.js` | Compiled entry (produced by `npm run build`). |
| `src/index.ts` | Action runner for GitHub (reads `core.getInput`, calls orchestrate). |
| `src/workflow/orchestrate.ts` | Full pipeline. |
| `src/agents/` | BE analyzer, frontend finder, comment generator, PR poster. |
| `src/utils/get-*-prompt.ts` | Prompt text per agent. |
| `src/constants/agent-token-defaults.ts` | Default step/token caps. |
| `src/constants/github-mcp-defaults.ts` | Default MCP URL constant. |

---

## License

MIT
