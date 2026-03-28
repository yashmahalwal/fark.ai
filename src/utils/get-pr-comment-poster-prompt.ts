import { PRCommentPosterInput } from "../schemas/pr-comment-poster-schema";

/**
 * Generates the prompt for the PR Comment Poster agent
 * @param input - PR comment poster input containing comments and PR info
 * @returns The complete prompt string for the comment poster
 */
export function getPRCommentPosterPrompt(input: PRCommentPosterInput): string {
  const { comments, backend_owner, backend_repo, pull_number } = input;

  return `You are an agent that creates a pending (draft) PR review, adds inline comments to it, and then submits it.

INPUT DATA:
- comments.summary: ${comments.summary}
- comments.comments array: ${comments.comments.length} comments to add
- comments to add: ${JSON.stringify(comments.comments)}

WORKFLOW:

1. Get PR head SHA (required for commitID):
   - Use \`pull_request_read\` method="get" to get PR information ONCE at the start
   - Extract head.sha from the PR response - this is the HEAD commit SHA
   - For PRs with multiple commits, use the HEAD commit (latest commit in the PR branch)
   - Save this SHA as commitID for step 2
   - Do NOT call pull_request_read again after this step. Do NOT use get_diff or any other method to read PR files/contents.

2. Create pending (draft) review:
   - Use \`pull_request_review_write\` method="create"
   - owner: "${backend_owner}", repo: "${backend_repo}", pullNumber: ${pull_number}
   - commitID: head.sha from step 1 (REQUIRED - use the HEAD commit SHA)
   - body: Use the summary from comments.summary: ${comments.summary}
   - Do NOT include the "event" parameter at all - omit it completely
   - By omitting the event parameter, a PENDING/DRAFT review will be created
   - Save the reviewId from the response - you will need it for steps 3 and 4
   
   - If creation fails because a pending review already exists (check tool response/error):
     * The error response will contain the reviewId of the existing pending review
     * Delete the existing pending review using \`pull_request_review_write\` method="delete"
     * For delete: owner: "${backend_owner}", repo: "${backend_repo}", pullNumber: ${pull_number}, reviewId: (from error response)
     * Then retry creating the review with method="create" (same parameters as above)

3. Add inline comments to the pending review:
   - If there are no comments to add, skip this step. Otherwise,
   - You MUST add ALL ${comments.comments.length} comments from the INPUT DATA section above — process \`comments.comments\` in **array order** (index 0, 1, …): the i-th \`add_comment_to_pending_review\` call corresponds to \`comments.comments[i]\`. If a later step must pair a vague tool error with an INPUT row and path/startLine/endLine/sides are ambiguous, use that **same index order** as the primary tie-breaker.
   - **Failures are defined only by tool outcomes:** After each \`add_comment_to_pending_review\` call, the tool result is either success or error. Any call that errors or rejects the inline (e.g. line out of range, invalid diff position, side mismatch, path not in PR) means that INPUT item was **not** posted inline and **must** appear in the \`submit_pending\` \`body\` in step 4 (see INPUT DATA for path, lines, sides, and full \`body\` text). Do not drop those items.
   - For each comment in the comments.comments array:
     - Use \`add_comment_to_pending_review\` tool
     - reviewId: The reviewId from step 2
     - path: comment.path (NOT comment.file - use the "path" field from each comment object)
     - subjectType: "LINE"
     - GitHub API uses "line" for the LAST line of the range (endLine), and "startLine" for the FIRST line
     - startLine: comment.startLine (first line of the range, REQUIRED)
     - line: comment.endLine (MUST use endLine as the "line" parameter - this is the last line of the range, REQUIRED)
     - startSide: comment.startSide (side for the start line, REQUIRED - "LEFT" for old file, "RIGHT" for new file)
     - side: comment.endSide (side for the end line, REQUIRED - "LEFT" for old file, "RIGHT" for new file)
     - Use the exact startSide and endSide values from the comment object - do not default to "RIGHT"
     - body: comment.body (the comment text, REQUIRED)
   - If \`add_comment_to_pending_review\` fails for any item: note the tool error text; **continue** with the next comment. In step 4 you will match failed tool calls back to INPUT entries by path/startLine/endLine/sides, using call order vs array index when the error text is vague, and copy the full \`body\` from INPUT plus the error into the top-level review \`body\`.
   
4. Submit the pending review (MANDATORY - must complete before stopping):
   - You MUST submit the review regardless of how many inline comments succeeded
   - Use \`pull_request_review_write\` method="submit_pending"
   - reviewId: The reviewId from step 2
   - event: "COMMENT" (required to submit the review)
   - **body (critical):** This is the **top-level review comment** visible on the PR. Supply the full markdown string as specified below; the host API may normalize or merge fields—your job is still to construct the complete intended \`body\`. Build it as:
     1. Start with \`comments.summary\` (the full markdown summary).
     2. Re-read the **tool results from step 3** in this conversation: for every \`add_comment_to_pending_review\` that failed, find the matching object in INPUT \`comments.comments\` (same path, startLine, endLine, sides; if ambiguous, use the same index order as step 3) and append it to \`body\`. If **any** such failures exist, add a section:
        - Heading: \`## Could not post as inline comments\`
        - Per failure: path, line range, sides, the **full** comment \`body\` from INPUT, and the error string returned by the tool.
     3. Use clear markdown. The reviewer must read every failed finding here; there is no inline thread for those.
   - If all inline comments succeeded, \`body\` may be just \`comments.summary\` (no extra section needed).

5. Return output IMMEDIATELY after submitting:
   - After step 4 (submitting the review), immediately return your output
   - Do NOT call any more tools after submitting the review
   - success: true if review was created AND submitted (even if some comments failed)
   - reviewId: ID of the review (from step 2 - the reviewId from the create response)
   - message: Status message describing what was accomplished (e.g. inline count vs total, and how many were folded into the top-level body if any failed)
}`;
}
