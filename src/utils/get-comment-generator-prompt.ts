import { CommentGeneratorInput } from "../agents/comment-generator";

/**
 * Generates the prompt for the PR Comment Generator agent
 * @param input - Comment generator input containing changes and PR info
 * @returns The complete prompt string for the comment generator
 */
export function getCommentGeneratorPrompt(
  input: CommentGeneratorInput
): string {
  const { changes, backend_owner, backend_repo, pull_number } = input;

  return `Generate inline PR comments for breaking API changes in PR #${pull_number} (${backend_owner}/${backend_repo}).

Backend Changes:
${JSON.stringify(changes, null, 2)}

Generate comments for ALL changes in the 'changes' array

COMMENT FORMAT:
⚠️ **Breaking API Change**

[Brief description of what changed]

**Technical Details:**
- [Specific change]
- Affects: [endpoints/types]

**Frontend Impact:**
- **[file]**: [How it breaks] ([severity]) [if frontendImpacts exist]
- No frontend impacts detected [if frontendImpacts empty]

Comment must contain proper markdown formatting for code, headings, lists and emphasis. Comments should be concise and to the point.

WORKFLOW:
1. Extract coordinates per change:
   - path: change.file (repo-relative file path) - REQUIRED
   - ⚠️ CRITICAL: startLine, endLine, startSide, and endSide MUST come from change.diffHunks[0]
   - ⚠️ These are line numbers and sides from the PR diff blob (from BE Analyzer output) - use them exactly as provided
   - startLine: change.diffHunks[0].startLine - Use the startLine from the diffHunk (line number in diff blob). For single-line comments, set both startLine and endLine to the same line number.
   - endLine: change.diffHunks[0].endLine - Use the endLine from the diffHunk (line number in diff blob). For single-line comments, set both startLine and endLine to the same line number.
   - startSide: change.diffHunks[0].startSide - Use the startSide from the diffHunk ("LEFT" for old file/removed lines, "RIGHT" for new file/added lines)
   - endSide: change.diffHunks[0].endSide - Use the endSide from the diffHunk ("LEFT" for old file/removed lines, "RIGHT" for new file/added lines)
   - ⚠️ Do NOT modify or recalculate these values - use them exactly as provided by BE Analyzer
   - body: Comment text - REQUIRED

2. Generate comment body for each change:
   - Use the COMMENT FORMAT below
   - Group frontend impacts by repo: Extract owner/repo and branch from frontendRepo string (format: "owner/repo:branch")
   - Format: **[owner/repo]** (branch: branch): \`[file]\` - [How it breaks] (severity: \`[severity]\`)
   - Example: If frontendRepo is "yashmahalwal/fark-frontend-demo:main", use "**yashmahalwal/fark-frontend-demo** (branch: main): \`src/api.ts\` - [description] (severity: \`high\`)
   - Make comments concise and clear

3. Generate summary:
   - Markdown summary of all breaking changes
   - Include count of changes and key highlights

4. Return output:
   - summary: Markdown summary text (REQUIRED)
   - comments: Array of comment objects (REQUIRED)
   - Each comment object MUST include ALL fields: path, startLine, endLine, startSide, endSide, body
   - ALL line numbers MUST be positive integers (no 0 values):
     * startLine: Actual start line number from diffHunks[0].startLine (REQUIRED, must be > 0)
     * endLine: Actual end line number from diffHunks[0].endLine (REQUIRED, must be > 0). For single-line comments, set both startLine and endLine to the same line number.
     * startSide: Actual start side from diffHunks[0].startSide ("LEFT" or "RIGHT", REQUIRED)
     * endSide: Actual end side from diffHunks[0].endSide ("LEFT" or "RIGHT", REQUIRED)

OUTPUT REQUIREMENTS:
- Generate comments for ALL changes in the 'changes' array
- ALL fields are REQUIRED:
  * startLine: Actual start line number from diffHunks[0].startLine (MUST be > 0, no file-level comments)
  * endLine: Actual end line number from diffHunks[0].endLine (MUST be > 0, no file-level comments). For single-line comments, same as startLine.
  * startSide: Actual start side from diffHunks[0].startSide ("LEFT" or "RIGHT", REQUIRED)
  * endSide: Actual end side from diffHunks[0].endSide ("LEFT" or "RIGHT", REQUIRED)
- Group frontend impacts by repo in the comment body
- Extract owner/repo and branch from frontendRepo string (format: "owner/repo:branch", e.g., "yashmahalwal/fark-frontend-demo:main")
- Format: **[owner/repo]** (branch: branch): [file] - [description] ([severity])
- Example: frontendRepo "yashmahalwal/fark-frontend-demo:main" → "**yashmahalwal/fark-frontend-demo** (branch: main): src/api.ts - [description] (high)"
- Use proper markdown in comments and summary (##, **, -, code blocks)
- Return summary and comments array`;
}
