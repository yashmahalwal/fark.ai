# Fark.ai: Automated PR API Impact Analysis

This document describes the design of an automated system that:

- Detects **backend API interface changes** in a pull request
- Determines **frontend impact** of those changes
- Posts **inline comments** on the PR diff
- Uses **GitHub Remote MCP** for all repository access
- Uses **OpenAI Agents** for reasoning
- Integrated into a **GitHub Actions** pipeline

---

## Architecture

```text
                          ┌─────────────────────────────┐
                          │ GitHub Actions Runner       │
                          │ (Triggers on Pull Request)   │
                          └───────────────┬─────────────┘
                                          │
                       +------------------▼------------------+
                       |     Agent 1: BE Diff Analyzer        |
                       |     (OpenAI Agent + GitHub MCP)      |
                       +------------------┬------------------+
                                          │
                         backendChanges   │
                         (JSON)           │
                                          │
                       +------------------▼------------------+
                       |  Agent 2: Frontend Impact Finder     |
                       |  (OpenAI Agent + GitHub MCP)         |
                       +------------------┬------------------+
                                          │
                         frontendImpacts  │
                         (JSON)           │
                                          │
                       +------------------▼------------------+
                       |    Agent 3: PR Comment Generator     |
                       |    (OpenAI Agent)                    |
                       +------------------┬------------------+
                                          │
                             GitHub PR Comments (Inline)
                             (via GitHub MCP)
```

---

## Environment & Tokens

| Token / Variable    | Source / Provided      | Purpose                                   |
| ------------------- | ---------------------- | ----------------------------------------- |
| `GITHUB_TOKEN`      | GitHub Actions         | GitHub MCP for backend & posting comments |
| `FE_FRONTEND_TOKEN` | GitHub Secret          | GitHub MCP for private frontend repos     |
| `OPENAI_API_KEY`    | GitHub Secret          | OpenAI API for agent reasoning            |
| `BASE_BRANCH`       | Input / default `main` | Only analyze PRs targeting this branch    |
| `FRONTEND_BRANCH`   | Input / default `main` | Branch for frontend repos                 |

### Permissions

```yaml
permissions:
  contents: read
  pull-requests: write
```

This allows reading repo contents (via MCP) and posting inline comments.

---

## Workflow Trigger

Only run analysis for PRs targeting a configured base branch (default: `main`):

```yaml
on:
  pull_request:
    branches:
      - main
```

In your script:

```js
if (github.context.payload.pull_request.base.ref !== process.env.BASE_BRANCH) {
  console.log("Skipping analysis: base branch mismatch");
  return;
}
```

---

## GitHub Remote MCP Tools

Agents rely exclusively on **GitHub Remote MCP** for repository access and comment posting:

| MCP Tool                    | Purpose                               |
| --------------------------- | ------------------------------------- |
| `pulls.listFiles`           | List changed files in a PR            |
| `pulls.get (diff)`          | Fetch raw diff                        |
| `repos.getContent`          | Read specific files                   |
| `repos.getContentDir`       | List directory contents               |
| `pulls.createReviewComment` | Post inline comments on PR diff lines |

Agents _decide what to fetch_—no full clone of the repository is required.

---

## Three-Agent Pipeline

The three agents execute sequentially, with each agent's output serving as input to the next. All agents use OpenAI for reasoning and decision-making, while GitHub Remote MCP provides repository access.

### Agent 1 — **BE Diff Analyzer**

#### Objective

Extract API interface changes _only from diff_, without reconstructing entire API surfaces. Uses OpenAI Agents for reasoning about which changes constitute breaking API modifications.

#### Input

```json
{
  "backend": {
    "owner": "org",
    "repo": "backend-repo",
    "pull_number": 1234
  }
}
```

#### Process

1. Call `pulls.listFiles` to list changed files in the PR.
2. Call `pulls.get` with diff format to fetch relevant diff hunks.
3. Use OpenAI Agent reasoning to identify API-relevant changes:
   - Field renames or removals in request/response objects
   - Endpoint path changes
   - Parameter additions/removals
   - Type changes that affect serialization
   - Status code changes
4. Do **not** read entire files unrelated to API interface—focus only on diff context.
5. If no API-relevant changes are detected, output an empty `backendChanges` array.

#### Output

```json
{
  "backendChanges": [
    {
      "file": "src/routes/user.js",
      "diffHunks": [
        {
          "startLine": 45,
          "endLine": 50,
          "changes": [
            "-   email: data.userEmail",
            "+   emailAddress: data.userEmail"
          ]
        }
      ],
      "impact": "fieldRenamed",
      "description": "Renamed field `email` to `emailAddress`"
    }
  ]
}
```

---

### Agent 2 — **Frontend Impact Finder**

#### Objective

Determine where backend API changes impact frontend code. Uses OpenAI Agents to intelligently search and match API references across frontend repositories.

#### Input

```json
{
  "frontendRepos": [
    { "owner": "org", "repo": "frontend-web", "branch": "main" },
    { "owner": "org", "repo": "frontend-mobile", "branch": "main" }
  ],
  "backendChanges": [ ... ]
}
```

#### Process

1. For each backend change entity (e.g., a renamed field), identify API terms (field names, endpoint paths, parameter names, etc.).
2. Search frontend code via MCP for references:
   - Use `repos.getContentDir` to explore frontend repository structure
   - Identify likely directories containing API calls (e.g., `api/`, `services/`, `utils/`)
   - Use `repos.getContent` to read relevant files and search for API term references
   - Pattern match against backend change identifiers (field names, endpoint URLs, etc.)
3. For each match found, track file, line number, and reference context. Determine issue severity (high/medium/low) and generate suggested fix.

#### Output

```json
{
  "frontendImpacts": [
    {
      "repo": "frontend-web",
      "file": "src/components/Profile.jsx",
      "line": 102,
      "reference": "User.email",
      "severity": "high",
      "suggestedFix": "Replace with `User.emailAddress`"
    }
  ]
}
```

---

### Agent 3 — **PR Comment Generator**

#### Objective

Generate inline PR comments at precise diff line numbers (backend change + frontend impact). Uses OpenAI Agents to craft clear, actionable comment messages that explain the breaking change and its impact.

#### Input

```json
{
  "backendChanges": [...],
  "frontendImpacts": [...],
  "backend_owner": "org",
  "backend_repo": "backend-repo",
  "pull_number": 1234
}
```

#### Process

1. For each backend change and related frontend impact:
   - Match backend diff hunks with impacted frontend references.
   - Use OpenAI Agent to generate clear, actionable comment text that explains:
     - What changed in the backend API
     - Which frontend files/repos are impacted
     - Suggested fix or action
2. Include diff line positions from `backendChanges.diffHunks` for accurate inline placement.
3. If no frontend impacts were found, skip comment generation or post a summary comment indicating no impacts detected.

#### Output

```json
{
  "comments": [
    {
      "file": "src/routes/user.js",
      "line": 47,
      "body": "Renamed API field `email` to `emailAddress`, which breaks Profile.jsx at line 102. Update accordingly."
    }
  ],
  "summary": "1 breaking change with frontend impact detected."
}
```

---

## Posting Inline Comments

Post inline comments on the backend PR diff using GitHub Remote MCP:

1. For each comment generated by Agent 3, use `pulls.createReviewComment` with:
   - `owner`: Backend repository owner
   - `repo`: Backend repository name
   - `pull_number`: PR number
   - `commit_id`: The commit SHA from the PR (head commit)
   - `path`: File path from `backendChanges`
   - `line`: Line number from `backendChanges.diffHunks` (must match a line in the diff)
   - `body`: Comment text generated by Agent 3

2. Comments are posted inline on the specific diff lines where breaking changes occur.

3. If multiple frontend repos are impacted, aggregate all impacts in a single comment per backend change location.

**Note**: Line numbers must correspond to lines in the PR diff. Use the `startLine` or `endLine` values from `backendChanges.diffHunks` to ensure accurate placement.

---

## Example GitHub Action Workflow

```yaml
name: fark.ai

on:
  pull_request:
    branches:
      - main

permissions:
  contents: read
  pull-requests: write

jobs:
  analyze:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Run API Impact Analysis
        uses: your-org/fark-ai-action@v1
        with:
          backend_repo: ${{ github.repository }}
          pr_number: ${{ github.event.pull_request.number }}
          frontend_repos: "org/frontend-web,org/frontend-mobile"
          base_branch: main
          frontend_branch: main
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          FE_FRONTEND_TOKEN: ${{ secrets.FE_FRONTEND_TOKEN }}
```

---

## Error Handling & Edge Cases

- **No API changes detected**: Agent 1 returns empty `backendChanges`, pipeline completes without posting comments.
- **No frontend impacts found**: Agent 2 returns empty `frontendImpacts`, Agent 3 may post a summary comment or skip.
- **MCP API failures**: Handle rate limits and retries gracefully. Log errors and fail the GitHub Action step.
- **Invalid line numbers**: Validate diff line numbers before posting comments to prevent API errors.
- **Private frontend repos**: Use `FE_FRONTEND_TOKEN` for authenticated access via GitHub MCP.

## Summary

- **Three AI agents** with clear responsibilities executing sequentially
- **GitHub Remote MCP** used for all repository reading and comment posting
- **OpenAI Agents** provide reasoning for change detection, impact analysis, and comment generation
- **GitHub Actions** for orchestration and comment posting
- **Tokens & environment variables** supplied securely
- Backend agent focuses on **diff-relevant data only** to minimize API calls
- Robust error handling for edge cases and API failures

---
