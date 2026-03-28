"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommentGeneratorPrompt = getCommentGeneratorPrompt;
/**
 * Generates the prompt for the PR Comment Generator agent
 * @param input - Comment generator input containing changes and PR info
 * @returns The complete prompt string for the comment generator
 */
function getCommentGeneratorPrompt(input) {
    const { changes, backend_owner, backend_repo, pull_number } = input;
    const totalHunks = changes.reduce((n, c) => n + c.diffHunks.length, 0);
    return `Generate inline PR comments for breaking API changes in PR #${pull_number} (${backend_owner}/${backend_repo}).

Backend Changes:
${JSON.stringify(changes, null, 2)}

Generate comments for ALL changes in the 'changes' array.

Exact count and order: Add up every \`diffHunks.length\` in the JSON above — the total is **${totalHunks}**. Your \`comments\` array MUST have exactly that many entries, in this order: for each change in array order, for each of its \`diffHunks\` in array order, append one comment object (then the next change, etc.). Never merge hunks.

PER HUNK:
- One GitHub inline comment per \`diffHunk\` — every hunk gets its own anchor. Do **not** merge several hunks into one comment because the story sounds the same.
- \`comments\` array length MUST be **${totalHunks}** (sum of all \`diffHunks.length\`).
- For multiple hunks under the same \`change\`, repeat the **full** \`frontendImpacts\` list on **each** of those comments (redundant on purpose so every thread is self-contained).
- If **${totalHunks}** is 0, return \`comments: []\` and still provide \`summary\` (brief note that no diff hunks were supplied or equivalent).

COMMENT FORMAT:
⚠️ **Breaking API Change**

[Explanation of the breaking change at this specific diff location - what changed and why it breaks]

**Frontend Impact:**
- **[owner/repo]** (branch: branch): \`[file]\` - [How it breaks] (severity: \`[severity]\`) [for each frontend impact]
- Skip the entire "Frontend Impact:" section if frontendImpacts array is empty - do not include "No frontend impacts detected" or any mention of frontend impacts

Comment must contain proper markdown formatting for code, headings, lists and emphasis. Comments should be concise and to the point.

WORKFLOW:
1. For EACH change, iterate through ALL \`change.diffHunks\` in order:
   - One GitHub comment per hunk (PER HUNK); e.g. 3 hunks ⇒ 3 comments, each scoped to that hunk only.
   - For each \`diffHunk\` in \`change.diffHunks\`:
     * path: change.file (repo-relative file path) - REQUIRED
     * startLine: diffHunk.startLine - Use the startLine from this diffHunk (line number in diff blob). For single-line comments, set both startLine and endLine to the same line number.
     * endLine: diffHunk.endLine - Use the endLine from this diffHunk (line number in diff blob). For single-line comments, set both startLine and endLine to the same line number.
     * startSide: diffHunk.startSide - Use the startSide from this diffHunk ("LEFT" for old file/removed lines, "RIGHT" for new file/added lines)
     * endSide: diffHunk.endSide - Use the endSide from this diffHunk ("LEFT" for old file/removed lines, "RIGHT" for new file/added lines)
     * ⚠️ Do NOT modify or recalculate these values - use them exactly as provided by BE Analyzer
     * body: Comment text explaining the breaking change at THIS diff location - REQUIRED

2. Generate comment body for each diffHunk:
   - COMMENT BODY STRUCTURE. Each comment must contain:
      1. **Comment content**: Explain the breaking change relevant to THIS specific diff hunk location
      2. **Frontend impacts**: List all frontend repos and their impacts ONLY if frontendImpacts array is not empty - if empty, skip this entire section
   - Explain the breaking change relevant to THIS specific diff hunk location
   - Include ALL frontend impacts for this change (grouped by repo) ONLY if frontendImpacts array has items — list the **complete** set on **every** hunk comment for this change (same list each time)
   - If frontendImpacts is empty, do NOT include the "Frontend Impact:" section at all - skip it entirely
   - Extract owner/repo and branch from frontendRepo string (format: "owner/repo:branch")
   - Format: **[owner/repo]** (branch: branch): \`[file]\` - [How it breaks] (severity: \`[severity]\`)
   - Example: If frontendRepo is "yashmahalwal/fark-frontend-demo:main", use "**yashmahalwal/fark-frontend-demo** (branch: main): \`src/api.ts\` - [description] (severity: \`high\`)
   - Make comments concise and clear

3. Generate summary:
   - Markdown summary of all breaking changes
   - Describe the changes and key highlights
   - Do not include the count of comments/changes in the summary text (this instruction applies ONLY to the summary formatting - you must still generate ALL comments for ALL changes)

4. Return output:
   - summary: Markdown summary text (REQUIRED)
   - comments: Array of comment objects (REQUIRED), length **${totalHunks}** (see PER HUNK; if zero hunks, empty array)
   - Each comment object MUST include ALL fields: path, startLine, endLine, startSide, endSide, body
   - ALL line numbers MUST be positive integers (no 0 values):
     * startLine: Actual start line number from diffHunk.startLine (REQUIRED, must be > 0)
     * endLine: Actual end line number from diffHunk.endLine (REQUIRED, must be > 0). For single-line comments, set both startLine and endLine to the same line number.
     * startSide: Actual start side from diffHunk.startSide ("LEFT" or "RIGHT", REQUIRED)
     * endSide: Actual end side from diffHunk.endSide ("LEFT" or "RIGHT", REQUIRED)

OUTPUT REQUIREMENTS:
- Same coverage as PER HUNK and steps 1–2: every \`diffHunk\` across all changes gets one comment; \`comments\` length **${totalHunks}**; no theme-level merging.
- Summary text: Do not include the count of comments/changes in the summary body (this applies ONLY to summary formatting — you must still generate ALL comments for ALL changes when **${totalHunks}** > 0).
- ALL fields are REQUIRED:
  * startLine: Actual start line number from diffHunk.startLine (MUST be > 0, no file-level comments)
  * endLine: Actual end line number from diffHunk.endLine (MUST be > 0, no file-level comments). For single-line comments, same as startLine.
  * startSide: Actual start side from diffHunk.startSide ("LEFT" or "RIGHT", REQUIRED)
  * endSide: Actual end side from diffHunk.endSide ("LEFT" or "RIGHT", REQUIRED)
- Group frontend impacts by repo in the comment body (only if frontendImpacts array is not empty - skip the section entirely if empty)
- Extract owner/repo and branch from frontendRepo string (format: "owner/repo:branch", e.g., "yashmahalwal/fark-frontend-demo:main")
- Format: **[owner/repo]** (branch: branch): [file] - [description] ([severity])
- Example: "**yashmahalwal/fark-frontend-demo** (branch: main): src/api.ts - [description] (high)"
- Use proper markdown in comments and summary (##, **, -, code blocks)
- Return summary and comments array`;
}
//# sourceMappingURL=get-comment-generator-prompt.js.map