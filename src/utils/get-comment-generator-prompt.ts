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

  return `Generate brief inline PR comments for pull request #${pull_number} in ${backend_owner}/${backend_repo}.

Backend Changes (with Frontend Impacts):
${JSON.stringify(changes, null, 2)}

CRITICAL: Generate comments for ALL backend breaking changes in the 'changes' array, regardless of whether they have frontend impacts.

For EACH change in the 'changes' array:
1. Create ONE comment per change at the appropriate diff line
   - Use startLine from the first diffHunk to determine comment position
   - File path comes from change.file
   - Comment format:
     * Brief explanation of the backend breaking change (1-2 sentences)
     * If frontend impacts exist (frontendImpacts array is not empty):
       - Add "Frontend impacts:" section
       - For each impact: file path, line number (from codeHunk.startLine), and affected API element
       - Include code snippet from codeHunk.code if relevant
       - Mention severity (high/medium/low)
     * If NO frontend impacts exist (frontendImpacts array is empty):
       - Still explain the breaking change
       - Optionally note that no frontend impacts were detected (but this is not required)
     * Keep comments concise and direct

2. Comment structure:
   - Start with: "⚠️ Breaking API Change: [brief description]"
   - If impacts exist: "Frontend impacts:" followed by brief list
     - Each impact: "• [file]:[line] - [apiElement] ([severity])"
     - Include code snippet if it helps understand the impact
   - If no impacts: Just explain the breaking change

CRITICAL: You MUST post comments directly to the PR using the available tools. Do NOT just return comments in the output.

PROCESS:
1. Get the PR head commit SHA using pull_request_read
2. Create a review with a summary of all breaking changes using pull_request_review_write
3. For EACH change in the 'changes' array, add an inline comment using add_comment_to_pending_review
   - This tool automatically finds your latest pending review on the PR and attaches the comment to it
   - It uses the review you created in step 2
4. After posting all comments, return the comments array in the output schema

Note: You have access to the results of all previous tool calls, so you can reference the review you created when adding comments.
Return ALL comments in the output, including comments for changes with 0 frontend impacts.`;
}
