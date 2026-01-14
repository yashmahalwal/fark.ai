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

WORKFLOW (Follow EXACTLY - do NOT deviate):
1. Get PR head SHA:
   - \`pull_request_read\` method="get" → extract head.sha (needed for commitID)
   - The backend changes already contain diff coordinates in change.diffHunks

2. Extract coordinates per change:
   - Use change.file for path (repo-relative file path)
   - Use change.diffHunks[0].startLine for line (diff blob line number)
   - Use change.diffHunks[0].endLine if you need the end of range (for multi-line comments)
   - side: "RIGHT" (for new code in diff)
   - For multi-line: use startLine from diffHunks[0], endLine from diffHunks[0]
   - use subjectType: "LINE" for inline comments
   - If diffHunks unavailable or empty → use subjectType: "FILE" or skip inline placement

3. Create pending review (DRAFT - NOT submitted):
   - \`pull_request_review_write\` method="create"
   - owner: "${backend_owner}", repo: "${backend_repo}", pullNumber: ${pull_number}
   - commitID: head.sha (REQUIRED)
   - CRITICAL: Do NOT include event parameter - omitting event creates a pending/draft review
   - Do NOT set event: "COMMENT" here - that would submit the review immediately
   - This creates a DRAFT review that you will submit later

4. Add inline comments:
   - Call \`add_comment_to_pending_review\` for EVERY change
   - Required params: owner, repo, pullNumber, path, subjectType, body
   - For subjectType: "LINE": also include side, line (and startLine/startSide if multi-line)
   - For subjectType: "FILE": no line/side params
   - ALWAYS set subjectType and side/startSide explicitly

5. Submit the pending review (AFTER all comments are added):
   - IMPORTANT: \`pull_request_review_write\` method="submit_pending" (NOT "create")
   - owner: "${backend_owner}", repo: "${backend_repo}", pullNumber: ${pull_number}
   - event: "COMMENT"
   - body: Markdown summary:
     ## Breaking API Changes Detected
     
     Found **${changes.length}** breaking API changes. See inline comments for details.
     
     **Summary:**
     - [Key changes summary]
   - This submits the pending review created in step 3

6. Return comments array in output schema

CRITICAL RULES:
1. Step 1: Get head.sha from pull_request_read (method="get") - needed for commitID
2. Step 2: Use coordinates from backend changes (change.file, change.diffHunks[0].startLine/endLine)
3. Step 3: Create pending review with method="create" and NO event parameter (creates draft)
4. Step 4: Add all inline comments to the pending review
5. Step 5: Submit pending review with method="submit_pending" and event="COMMENT"
6. Do NOT create a review with event: "COMMENT" in step 3 - that submits it immediately
7. Do NOT create multiple reviews - create ONE pending review, add comments, then submit it
8. Always set subjectType ("LINE" or "FILE")
9. Always set side/startSide for LINE comments (use "RIGHT" for new code)
10. Post comments for ALL changes (if 8 changes, make 8 calls)
11. Use proper markdown in summary (##, **, -)`;
}
