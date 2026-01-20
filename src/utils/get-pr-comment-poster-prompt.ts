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
${comments.comments.length > 0 ? `\nComments to add:\n${JSON.stringify(comments.comments, null, 2)}` : "\n⚠️ WARNING: comments.comments array is empty - no inline comments to add"}

WORKFLOW:

1. Get PR head SHA (required for commitID):
   - Use \`pull_request_read\` method="get" to get PR information ONCE at the start
   - Extract head.sha from the PR response - this is the HEAD commit SHA
   - For PRs with multiple commits, use the HEAD commit (latest commit in the PR branch)
   - Save this SHA as commitID for step 2
   - ⚠️ CRITICAL: Do NOT call pull_request_read again after this step. Do NOT use get_diff or any other method to read PR files/contents.

2. Create pending (draft) review:
   - Use \`pull_request_review_write\` method="create"
   - owner: "${backend_owner}", repo: "${backend_repo}", pullNumber: ${pull_number}
   - commitID: head.sha from step 1 (REQUIRED - use the HEAD commit SHA)
   - body: Use the summary from comments.summary: ${comments.summary}
   - ⚠️ CRITICAL: Do NOT include the "event" parameter at all - omit it completely
   - By omitting the event parameter, a PENDING/DRAFT review will be created
   - Save the reviewId from the response - you will need it for steps 3 and 4
   
   - If creation fails because a pending review already exists (check tool response/error):
     * The error response will contain the reviewId of the existing pending review
     * Delete the existing pending review using \`pull_request_review_write\` method="delete"
     * For delete: owner: "${backend_owner}", repo: "${backend_repo}", pullNumber: ${pull_number}, reviewId: (from error response)
     * Then retry creating the review with method="create" (same parameters as above)

3. Add inline comments to the pending review:
   - ⚠️ CRITICAL: You MUST add ALL ${comments.comments.length} comments from the INPUT DATA section above
   - The comments are provided in the INPUT DATA section - use those exact comment objects
   - For each comment in the comments.comments array (see INPUT DATA above):
     - Use \`add_comment_to_pending_review\` tool
     - reviewId: The reviewId from step 2
     - path: comment.path (NOT comment.file - use the "path" field from each comment object in INPUT DATA)
     - subjectType: "LINE"
     - ⚠️ CRITICAL: GitHub API uses "line" for the LAST line of the range (endLine), and "startLine" for the FIRST line
     - startLine: comment.startLine (first line of the range, REQUIRED)
     - line: comment.endLine (MUST use endLine as the "line" parameter - this is the last line of the range, REQUIRED)
     - startSide: comment.startSide (side for the start line, REQUIRED - "LEFT" for old file, "RIGHT" for new file)
     - side: comment.endSide (side for the end line, REQUIRED - "LEFT" for old file, "RIGHT" for new file)
     - ⚠️ IMPORTANT: Use the exact startSide and endSide values from the comment object - do not default to "RIGHT"
     - body: comment.body (the comment text, REQUIRED)
   - ⚠️ You MUST iterate through ALL ${comments.comments.length} comments and add each one
   - ⚠️ IMPORTANT: If a comment fails to add (e.g., line range mismatch), note it but continue with other comments
   - ⚠️ CRITICAL: Do NOT call pull_request_read with get_diff or any other method to fetch PR files/contents. If comments fail, proceed to step 4 and include failed comment content in the review body.
   
4. Submit the pending review (MANDATORY - must complete before stopping):
   - ⚠️ CRITICAL: You MUST submit the review even if some comments failed to add or if not all comments were added successfully
   - ⚠️ CRITICAL: You MUST submit the review regardless of how many comments were successfully added
   - If any comments failed to add, include their content in the review body along with the summary
   - Use \`pull_request_review_write\` method="submit_pending"
   - reviewId: The reviewId from step 2
   - event: "COMMENT" (required to submit the review)
   - body: Start with comments.summary, then append any failed comments with their content
   - Format for failed comments: "\\n\\n**Failed to add inline comment:**\\n- File: [path]\\n- Lines: [startLine-endLine]\\n- Content: [body]"
   - ⚠️ Do NOT wait for all comments to be added successfully - submit the review with whatever comments were added

5. Return output IMMEDIATELY after submitting:
   - ⚠️ CRITICAL: After step 4 (submitting the review), you MUST immediately return your output
   - Do NOT call any more tools after submitting the review
   - Do NOT call pull_request_read to get reviews - this is not needed
   - Do NOT call any other tools - just return the output
   - success: true if review was created AND submitted (even if some comments failed)
   - reviewId: ID of the review (from step 2 - the reviewId from the create response)
   - message: Status message describing what was accomplished (e.g., "Review created and submitted successfully. Added X of Y comments.")

CRITICAL RULES:
- For method="create": Do NOT include "event" parameter - omit it completely
- For method="create": MUST include commitID with the PR head SHA (from step 1)
- For PRs with multiple commits: Use the HEAD commit SHA (latest commit in the PR branch)
- For method="submit_pending": MUST include event="COMMENT" to submit the review
- A pending review is not visible until submitted with method="submit_pending"
- ⚠️ ONLY call pull_request_read ONCE at the start (step 1) to get SHA - NEVER call it again
- ⚠️ Do NOT call pull_request_read with get_diff, get_reviews, or any other method after step 1
- ⚠️ If comments fail to add, include their content in the review body and submit anyway
- ⚠️ You MUST submit the review (step 4) before returning output - never stop without submitting
}`
}
