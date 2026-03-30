import { CommentGeneratorInput } from "../schemas/comment-generator-schema";


/**
 * Generates the prompt for the PR Comment Generator agent
 * @param input - Comment generator input containing changes and PR info
 * @returns The complete prompt string for the comment generator
 */
export function getCommentGeneratorPrompt(
  input: CommentGeneratorInput
): string {
  const { changes, backend_owner, backend_repo, pull_number } = input;

  const totalChanges = changes.length;

  return `Generate inline PR comments for breaking API changes in PR #${pull_number} (${backend_owner}/${backend_repo}).

Backend Changes:
${JSON.stringify(changes, null, 2)}

Generate ONE comment per change in the 'changes' array. Total comments: **${totalChanges}**.
If \`changes\` is empty, return \`comments: []\` and a summary noting no breaking changes were found.

ANCHOR (per comment):
Use the FIRST diffHunk of the change to anchor the comment:
- path: change.file
- startLine: change.diffHunks[0].startLine (MUST be > 0)
- endLine: change.diffHunks[0].endLine (MUST be > 0; if same as startLine, that is fine)
- startSide: change.diffHunks[0].startSide ("LEFT" or "RIGHT")
- endSide: change.diffHunks[0].endSide ("LEFT" or "RIGHT")
Do NOT modify or recalculate these values — use them exactly as provided.

COMMENT FORMAT:
⚠️ **Breaking API Change**

[Concise explanation of what changed and why it breaks existing contracts]

**Frontend Impact:**
- **[owner/repo]** (branch: [branch]): \`[file]\` — [how it breaks] (severity: \`[severity]\`)
(one bullet per impacted frontend file; omit this entire section if frontendImpacts is empty)

Use proper markdown (bold, backticks, lists). Keep comments concise.

WORKFLOW:
1. For EACH change (in array order), produce ONE comment:
   - Anchor to the first diffHunk as described above.
   - Body: explain the breaking change (what was removed/renamed/altered and why it matters).
   - If frontendImpacts is non-empty, list every impact grouped by repo.
     Extract owner/repo and branch from frontendRepo (format "owner/repo:branch").
   - If frontendImpacts is empty, omit the "Frontend Impact:" section entirely.

2. Generate summary:
   - Markdown overview of all breaking changes and their frontend impact.
   - Do not include a raw count of changes in the summary text.

OUTPUT:
- summary: markdown string (REQUIRED)
- comments: array of exactly **${totalChanges}** objects (REQUIRED), each with:
  * path (string, REQUIRED)
  * startLine (positive integer, REQUIRED)
  * endLine (positive integer, REQUIRED)
  * startSide ("LEFT" or "RIGHT", REQUIRED)
  * endSide ("LEFT" or "RIGHT", REQUIRED)
  * body (string, REQUIRED)`;
}
