# fark.ai

An agentic GitHub Action that analyzes a backend PR for breaking API changes, and cross validates across frontend codebases to find real-world breaking changes.

---

## Quick start

Add this workflow to your **backend** repository under `.github/workflows/`:

```yaml
name: Fark AI — breaking API review

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  pull-requests: write  # post review comments
  contents: read        # read repo files and diff

jobs:
  fark:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout backend (this PR)
        uses: actions/checkout@v4
        with:
          # The action only reads what is already checked out on disk
          path: backend

      - name: Checkout fark-frontend-demo
        uses: actions/checkout@v4
        with:
          # Frontend repo to scan for breakages
          repository: your-org/your-frontend
          ref: main
          # Must be the `codebasePath` used later in `frontends: |`
          path: your-frontend
          # PAT for private/cross-org frontends; omit if not needed
          token: ${{ secrets.FARK_FRONTEND_GITHUB_TOKEN }}

      - name: Checkout fark-mobile-demo
        uses: actions/checkout@v4
        with:
          # Mobile repo to scan for breakages
          repository: your-org/your-mobile
          ref: main
          # Must be the `codebasePath` used later in `frontends: |`
          path: your-mobile
          # PAT for private/cross-org frontends; omit if not needed
          token: ${{ secrets.FARK_FRONTEND_GITHUB_TOKEN }}

      - name: Run fark.ai
        uses: yashmahalwal/fark.ai@main
        with:
          # Token used by MCP to read the backend PR and post review comments
          backend_github_token: ${{ github.token }}
          # OpenAI key used by all agents
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          # Backend identity (used by MCP)
          backend_owner: ${{ github.repository_owner }}
          backend_repo: ${{ github.event.repository.name }}
          # Where the backend is available on disk (must match checkout `path: backend`)
          backend_codebase_path: ${{ github.workspace }}/backend
          # YAML block scalar containing a JSON array of frontend configs
          frontends: |
            [
              {
                "repository": { "owner": "your-org", "repo": "your-frontend", "branch": "main" },
                # Must match the checkout `path:` for this frontend
                "codebasePath": "${{ github.workspace }}/your-frontend"
              },
              {
                "repository": { "owner": "your-org", "repo": "your-mobile", "branch": "main" },
                # Must match the checkout `path:` for this frontend
                "codebasePath": "${{ github.workspace }}/your-mobile"
              }
            ]
```

---

## Docs

- See: [`docs/fark-ai/README.md`](docs/fark-ai/README.md)
- [Architecture & Agents](docs/fark-ai/01-architecture.md)
- [Speed & Token Strategy](docs/fark-ai/02-speed-and-tokens.md)
- [Running Locally](docs/fark-ai/03-running-locally.md)
- [Maintenance & Publishing](docs/fark-ai/04-maintenance-and-publishing.md)
- [Examples](docs/fark-ai/05-examples.md)

---

## Workflow breakdown

### `on` / `permissions`

Trigger on pull requests. `pull-requests: write` is required to post review comments; `contents: read` to read the diff and files.

### Checkout steps

Check out the backend and every frontend **before** calling the action. The action only reads what is already on disk — it does not clone anything itself.

- Backend checkout goes into a named `path:` (e.g. `backend`).
- Each frontend goes into its own `path:` (sibling folders under `GITHUB_WORKSPACE`).
- For private or cross-org frontends, pass a PAT via `token:` on each checkout step (store as `FARK_FRONTEND_GITHUB_TOKEN` secret). Public repos may not need this.

### Action inputs

| What | Input | Notes |
|------|-------|-------|
| Token for reading backend PR + posting comments | `backend_github_token` | Use `${{ github.token }}` with the permissions above. Use a PAT if MCP rejects the job token (e.g. fork PRs). |
| OpenAI key | `openai_api_key` | Store as `OPENAI_API_KEY` secret. |
| Backend repo | `backend_owner`, `backend_repo` | Use `${{ github.repository_owner }}` and `${{ github.event.repository.name }}`. |
| Backend code on disk | `backend_codebase_path` | Must match the checkout `path:`. Use `${{ github.workspace }}/backend`. |
| Frontend list | `frontends` | JSON array — see below. |

### `frontends` JSON

Each entry in the array:

```json
{
  "repository": { "owner": "org", "repo": "repo-name", "branch": "main" },
  "codebasePath": "/absolute/or/relative/path"
}
```

`codebasePath` must match the `path:` used in the checkout step. Relative paths resolve against `GITHUB_WORKSPACE`. Pass as a YAML block scalar (`frontends: |`).

---

## Reference

### Required inputs

| Input | Description |
|-------|-------------|
| `backend_github_token` | GitHub token for backend PR access and MCP operations |
| `openai_api_key` | OpenAI API key |
| `backend_owner` | Backend repository owner |
| `backend_repo` | Backend repository name |
| `frontends` | Frontend configurations as JSON array |

### Optional inputs

| Input | Default | Description |
|-------|---------|-------------|
| `backend_pr_number` | From PR context | PR number to analyze |
| `backend_codebase_path` | `GITHUB_WORKSPACE` | Path to backend checkout on runner |
| `github_mcp_server_url` | `https://api.githubcopilot.com/mcp/` | GitHub MCP server URL |
| `log_level` | `info` | `fatal` / `error` / `warn` / `info` / `debug` / `trace` |
| `frontend_finder_concurrency_limit` | `5` | Max concurrent frontend scans |

### Agent token limits

Optional inputs to raise limits for large PRs (all default to the values below):

| Agent prefix | `_max_steps` | `_max_output_tokens` | `_max_total_tokens` |
|---|---|---|---|
| `be_analyzer` | 15 | 16 384 | 100 000 |
| `frontend_finder` | 22 | 16 384 | 150 000 |
| `comment_generator` | 12 | 8 192 | 48 000 |
| `pr_comment_poster` | 45 | 8 192 | 150 000 |

Example: `pr_comment_poster_max_total_tokens: 250000`

### Outputs

| Output | Description |
|--------|-------------|
| `changes_count` | Number of backend breaking changes detected |
| `impacts_count` | Total number of frontend impacts found |
| `comments_count` | Number of PR comments posted |

Use with `${{ steps.<step-id>.outputs.changes_count }}`.

---

## Maintenance

**Build:** `npm run build` — bundles `src/index.ts` → `dist/index.js` via esbuild.

**Local dev:** copy `.env.example` to `.env`, fill in secrets, then `npm run dev` to build and run. `npm run debug` to attach a debugger. `npm run typecheck` for type checking.

**Release:** a pre-push git hook (husky) runs `npm run build` automatically before every push and commits `dist/` if it changed. `dist/` must be committed for the action to work — the hook handles this without manual steps.
