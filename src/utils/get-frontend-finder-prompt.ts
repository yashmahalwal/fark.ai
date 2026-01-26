import { FrontendFinderInput } from "../agents/frontend-finder";

/**
 * Generates the prompt for the Frontend Impact Finder agent
 * @param input - Frontend finder input containing frontend repo and backend changes
 * @returns The complete prompt string for the finder
 */
export function getFrontendFinderPrompt(input: FrontendFinderInput): string {
  const { repository, backendChanges } = input;
  const { owner, repo, branch } = repository;

  return `Analyze frontend codebase ${owner}/${repo} (branch: ${branch}) to identify ALL places where these backend API changes will BREAK the frontend code.

Backend API changes to analyze:
${JSON.stringify(backendChanges.backendChanges)}

CONSTRAINTS:
- Only report impacts where the backend change will ACTUALLY BREAK the frontend code

TOOLS:
- bash: Use for codebase traversal and searching
- readFile: Read specific files only when you must confirm details that cannot be derived from bash operations

WORKFLOW:
1. Extract API elements from backend changes (endpoints, queries, fields, types)
2. Search for these elements in the frontend codebase
3. Read files only when search results indicate breaking usage

EFFICIENCY:
- Start with targeted searches - avoid broad/generic searches that you'll need to refine later
- Use grep with flags that show file paths: \`grep -rn pattern .\` (recursive) or \`grep -Hn pattern file\` (single file) - this gives you file locations without needing directory exploration
- Do not use ls/find without a clear reason - they are wasteful if grep can provide the information you need
- Do not repeat searches - if you already searched for a term, don't search again with different flags or patterns
- readFile is expensive (consumes significant tokens) - use only when search results show breaking usage and you need to confirm details

OUTPUT:
- frontendImpacts array with: backendChangeId, frontendRepo, file, apiElement, description (high-level summary), severity
- frontendRepo: MUST be a string in format "owner/repo:branch" (e.g., "${owner}/${repo}:${branch}"). This is REQUIRED for each impact - use the repository information provided.
- Focus on confirming that breaking impacts exist, not exhaustive enumeration
- Return empty array only if no impacts found after checking a reasonable sample of files`;
}
