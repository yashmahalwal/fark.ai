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
                       +------------------┬------------------+
                                          │
                         backendChanges    ├───► Used by Next
                                          │
                       +------------------▼------------------+
                       |  Agent 2: Frontend Impact Finder     |
                       +------------------┬------------------+
                                          │
                         frontendImpacts   ├───► For Comments
                                          │
                       +------------------▼------------------+
                       |    Agent 3: PR Comment Generator     |
                       +------------------┬------------------+
                                          │
                             GitHub PR Comments (Inline/Top)
```

---

## Environment & Tokens

| Token / Variable         | Source / Provided                   | Purpose |
|--------------------------|--------------------------------------|---------|
| `GITHUB_TOKEN`           | GitHub Actions                      | GitHub MCP for backend & posting comments |
| `FE_FRONTEND_TOKEN`      | GitHub Secret                       | GitHub MCP for private frontend repos     |
| `OPENAI_API_KEY`         | GitHub Secret                       | OpenAI API for agent reasoning            |
| `BASE_BRANCH`            | Input / default `main`              | Only analyze PRs targeting this branch    |
| `FRONTEND_BRANCH`        | Input / default `main`              | Branch for frontend repos                 |

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

Agents rely exclusively on **GitHub Remote MCP** for repository access:

| MCP Tool                     | Purpose |
|-----------------------------|---------|
| `pulls.listFiles`           | List changed files in a PR |
| `pulls.get (diff)`          | Fetch raw diff |
| `repos.getContent`          | Read specific files |
| `repos.getContentDir`       | List directory contents |

Agents *decide what to fetch*—no full clone of the repository is required.

---

## Three-Agent Pipeline

### Agent 1 — **BE Diff Analyzer**

#### Objective

Extract API interface changes *only from diff*, without reconstructing entire API surfaces.

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

1. Call `pulls.listFiles` to list changed files.
2. Call `pulls.get` with diff format to fetch relevant diff hunks.
3. Identify API-relevant changes (e.g., changed signatures, removed fields).
4. Do **not** read entire files unrelated to API interface.

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

Determine where backend API changes impact frontend code.

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

1. For each backend change entity (e.g., a renamed field), identify API terms.
2. Search frontend code via MCP for references:
   - Use code search APIs if available
   - Otherwise use `repos.getContentDir` + `repos.getContent`   
3. Track file, approximate line number, and reference context. Add issue severity and suggested fix.

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

Generate inline PR comments at precise diff line numbers (backend change + frontend impact).

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
   - Match backend diff hunks with impacted references.
   - Generate comment text with explanation and suggestion.
2. Include diff line positions from `backendChanges` for inline placement.

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

Post inline comments using GitHub MCP server:

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

      - name: Run API Impact Guard
        uses: your-org/breaking-guard-action@v1
        with:
          backend_repo: ${{ github.repository }}
          pr_number: ${{ github.event.pull_request.number }}
          frontend_repos: "org/frontend-web,org/frontend-mobile"
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          FE_FRONTEND_TOKEN: ${{ secrets.FE_FRONTEND_TOKEN }}
```

---

## Summary

- **Three AI agents** with clear responsibilities
- **GitHub Remote MCP** used for all repository reading
- **GitHub Actions** for orchestration and comment posting
- **Tokens & environment variables** supplied securely
- Backend agent focuses on **diff-relevant data only**

---