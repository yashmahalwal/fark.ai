# fark.ai

GitHub Action: analyze a **backend PR** for breaking API-style changes, scan **checked-out frontend repos** on disk, then open a **PR review** with inline comments. Runs on **Node 20**; entrypoint is `dist/index.js`.

---

## How to use (backend repository)

Put a workflow under **`.github/workflows/`** in the repo whose **pull requests** you want analyzed (the backend).

1. **Clone everything the action needs** before the `uses:` step:
   - **Backend** — this PR’s code (e.g. `actions/checkout@v4` with `path: backend`).
   - **Each frontend** — separate `actions/checkout` steps, each with its own `path:` (sibling folders under `GITHUB_WORKSPACE`, not nested inside the backend folder).

2. **Pass `backend_codebase_path`** and each frontend **`codebasePath`** (in the JSON) so they match those folders. Relative paths are resolved against `GITHUB_WORKSPACE`.

3. **Secrets / tokens** — see below. You need an **OpenAI** key and GitHub access for checkouts + MCP.

4. **Call the action**, e.g. `uses: <owner>/fark.ai@<ref>` with the required `with:` inputs (minimal example in the next section).

The action does **not** clone frontends for you; it only reads whatever is already on disk at `codebasePath`.

---

## Tokens and permissions

| What | Where | Needs |
|------|--------|--------|
| **Frontend repos** | `actions/checkout` only (`token:` on those steps) | Read access to clone those repos (PAT or fine-grained token). **Not** an input to fark.ai. |
| **Backend PR** | Action input `backend_github_token` | Whatever **GitHub MCP** requires for this repo’s PR: read files/diff/metadata and create review / review comments. |
| **OpenAI** | Action input `openai_api_key` | Valid API key (store as a **repository secret**, e.g. `OPENAI_API_KEY`). |

### Backend: reuse `GITHUB_TOKEN` (no extra backend secret)

If GitHub MCP accepts the job token, authorize the workflow on the **backend** repo and pass it in:

```yaml
permissions:
  contents: read          # read repo tree / files for the PR
  pull-requests: write    # create/update reviews and PR review comments

jobs:
  fark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          path: backend

      # … checkout each frontend with token: ${{ secrets.FARK_FRONTEND_GITHUB_TOKEN }} if needed …

      - uses: my-org/fark.ai@main
        with:
          backend_github_token: ${{ github.token }}
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          backend_owner: ${{ github.repository_owner }}
          backend_repo: ${{ github.event.repository.name }}
          backend_codebase_path: ${{ github.workspace }}/backend
          frontends: |
            [ { "repository": { "owner": "my-org", "repo": "my-web", "branch": "main" }, "codebasePath": "my-web" } ]
```

Use a **PAT secret** for `backend_github_token` instead if MCP rejects `GITHUB_TOKEN` or you hit permission limits (e.g. some **fork** PR workflows give the token only read access to the PR).

### Frontend: checkout token

Use a secret on **`actions/checkout`** for private or cross-org frontends, e.g. `token: ${{ secrets.FARK_FRONTEND_GITHUB_TOKEN }}` with a token that can **read** those repositories. Public repos may work without a custom token depending on your org settings.

---

## Full workflow example (backend + two frontends)

```yaml
name: Breaking API check

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  pull-requests: write
  contents: read

jobs:
  fark:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout backend (this PR)
        uses: actions/checkout@v4
        with:
          path: backend

      - name: Checkout frontend web
        uses: actions/checkout@v4
        with:
          repository: my-org/my-web-app
          ref: main
          path: my-web-app
          token: ${{ secrets.FARK_FRONTEND_GITHUB_TOKEN }}

      - name: Checkout frontend mobile
        uses: actions/checkout@v4
        with:
          repository: my-org/my-mobile-app
          ref: main
          path: my-mobile-app
          token: ${{ secrets.FARK_FRONTEND_GITHUB_TOKEN }}

      - name: Run fark.ai
        uses: my-org/fark.ai@main
        with:
          backend_github_token: ${{ github.token }}
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          backend_owner: ${{ github.repository_owner }}
          backend_repo: ${{ github.event.repository.name }}
          backend_codebase_path: ${{ github.workspace }}/backend
          frontends: |
            [
              {
                "repository": { "owner": "my-org", "repo": "my-web-app", "branch": "main" },
                "codebasePath": "my-web-app"
              },
              {
                "repository": { "owner": "my-org", "repo": "my-mobile-app", "branch": "main" },
                "codebasePath": "my-mobile-app"
              }
            ]
```

Pin `@v1` or a commit SHA instead of `@main` for reproducible runs. This repo must have **`dist/`** committed on the ref you use (`action.yml` runs `dist/index.js`).

---

## Monorepo (single checkout)

If backend and frontend live under one tree, one `actions/checkout` is enough; set `backend_codebase_path` and each `codebasePath` to folders under `${{ github.workspace }}` (relative or absolute).

---

## Action inputs (reference)

| Input | Required | Notes |
|-------|----------|--------|
| `backend_github_token` | Yes | MCP + backend PR (often `${{ github.token }}` with `permissions` above). |
| `openai_api_key` | Yes | OpenAI key. |
| `github_mcp_server_url` | No | Default `https://api.githubcopilot.com/mcp/`. |
| `backend_owner` | Yes | Backend repo owner. |
| `backend_repo` | Yes | Backend repo name. |
| `backend_pr_number` | No | From `pull_request` context if omitted. |
| `backend_codebase_path` | No | Backend root on runner; empty uses `GITHUB_WORKSPACE` in code. |
| `frontends` | Yes | JSON array string. |
| `log_level` | No | Default `info`. |
| `be_analyzer_*`, `frontend_finder_*`, `comment_generator_*`, `pr_comment_poster_*` | No | Step/output/total token caps (strings in YAML). |
| `frontend_finder_concurrency_limit` | No | Default `5`. |

## Outputs

`changes_count`, `impacts_count`, `comments_count` (strings). Use with `${{ steps.<id>.outputs.* }}`.

---

## `frontends` JSON

Array of objects:

- **`repository`**: `{ "owner", "repo", "branch" }` — labels / expectations (branch should match what you checked out).
- **`codebasePath`**: directory on the runner (relative to `GITHUB_WORKSPACE` unless absolute).
- **`options`** (optional): per-frontend `maxSteps`, `maxOutputTokens`, `maxTotalTokens`.

Pass as a YAML block scalar: `frontends: |` then the JSON.

---

## Default agent limits

| Agent | max steps | max output tokens | max total tokens |
|-------|-----------|-------------------|------------------|
| BE analyzer | 15 | 16_384 | 100_000 |
| Frontend finder | 22 | 16_384 | 150_000 |
| Comment generator | 12 | 8_192 | 48_000 |
| PR comment poster | 45 | 8_192 | 150_000 |

---

## Troubleshooting

| Issue | Check |
|-------|--------|
| `dist/index.js` missing | Use a ref where `dist/` is built and committed. |
| MCP / GitHub errors | Token type and scopes; try PAT for `backend_github_token`. |
| Frontend checkout fails | `token:` on checkout; read access to those repos. |
| Paths wrong | `codebasePath` / `backend_codebase_path` match checkout `path:` / folders. |

---

## Maintainers

- **Build:** `npm ci && npm run build` → `dist/`. Release workflow can commit `dist/` to the default branch (see `.github/workflows/release-build.yml`).
- **Local run:** `.env` from `.env.example`, then `npm run test:orchestrate` (uses `BACKEND_GITHUB_TOKEN`, paths in `FRONTENDS`, not checkout).

---

## License

MIT
