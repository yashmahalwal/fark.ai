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

  return `Generate inline PR comments for breaking API changes in PR #${pull_number} (${backend_owner}/${backend_repo}).

Backend Changes:
${JSON.stringify(changes, null, 2)}

Generate comments for each entry in the changes array:
Select the most relevant diffHunk. If multiple hunks make sense for distinct, non-redundant aspects of the same change.
Generate comments for each selected diffHunk which will later be posted on the PR review.

If \`changes\` is empty, return \`comments: []\` and a summary noting no breaking changes were found.

ANCHOR (per comment):
For the selected diffHunk's line metadata exactly for the output:
- path: change.file
- startLine: chosenHunk.startLine (MUST be > 0)
- endLine: chosenHunk.endLine (MUST be > 0; if same as startLine, that is fine)
- startSide: chosenHunk.startSide ("LEFT" or "RIGHT")
- endSide: chosenHunk.endSide ("LEFT" or "RIGHT")

Do NOT modify or recalculate these values — use them exactly as provided.

COMMENT FORMAT:
⚠️ **Breaking API Change**

[Concise explanation of what changed and why it breaks existing contracts]

**Frontend Impact:**
- **[owner/repo]** (branch: [branch]): \`[file]\` — [how it breaks] (severity: \`[severity]\`)
(one bullet per impacted frontend file; omit this entire section if frontendImpacts is empty)

Use proper markdown (bold, backticks, lists). Keep comments concise.

WORKFLOW:
1. For EACH change (in array order):
   - Select the minimal relevant diffHunk(s) from change.diffHunks needed to support non-redundant evidence for that change (usually 1; sometimes more if it adds distinct coverage).
   - Generate ONE inline PR comment per selected diffHunk.
   - Anchor each inline comment using the selected diffHunk's line metadata (use startLine/endLine/startSide/endSide exactly as provided).
   - Body: explain the breaking change (what was removed/renamed/altered and why it matters) once per comment.
   - If frontendImpacts is non-empty, list impacts grouped by repo in each comment body.
     Extract owner/repo and branch from frontendRepo (format "owner/repo:branch").
   - If frontendImpacts is empty, omit the "Frontend Impact:" section entirely.

2. Generate summary:
   - Markdown overview of all breaking changes and their frontend impact.
   - Do not include a raw count of changes in the summary text.

OUTPUT:
- summary: markdown string (REQUIRED)
- comments: array of inline comment objects (REQUIRED;), each with:
  * path (string, REQUIRED)
  * startLine (positive integer, REQUIRED)
  * endLine (positive integer, REQUIRED)
  * startSide ("LEFT" or "RIGHT", REQUIRED)
  * endSide ("LEFT" or "RIGHT", REQUIRED)
  * body (string, REQUIRED)`;
}
