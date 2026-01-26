import { FrontendFinderInput } from "../agents/frontend-finder";

/**
 * Generates the prompt for the Frontend Impact Finder agent
 * @param input - Frontend finder input containing frontend repo and backend changes
 * @returns The complete prompt string for the finder
 */
export function getFrontendFinderPrompt(input: FrontendFinderInput): string {
  const { repository, backendChanges } = input;
  const { owner, repo, branch } = repository;

  return `Analyze the frontend codebase to identify ALL places where these backend API changes will BREAK the frontend code.

The codebase is already available at the provided path - start searching immediately. Repository info (${owner}/${repo}, branch: ${branch}). It is ONLY used for output formatting in frontendRepo field.

Backend API changes to analyze:
${JSON.stringify(backendChanges.backendChanges)}

CONSTRAINTS:
- Only report impacts where the backend change will ACTUALLY BREAK the frontend code

TOOLS:
- bash: Use ONLY for searching (grep etc) and reading file sections (sed, head, tail, awk etc). Can be used for explore file strucutre only if nothing else works.
- readFile: Use ONLY as last resort when bash cannot provide the needed information

CRITICAL - DO NOT:
- DO NOT traverse directories - search directly for API elements. DO NOT use ls, find, or any directory listing commands unless absolutely necessary. Rely on search for file paths and sections.
- DO NOT use any git operations, codebase is already available at the provided path.

WORKFLOW:
1. Extract ALL API elements from ALL backend changes (exact endpoint paths, query names, mutation names, field names, type names)
2. For EACH backend change, search for its EXACT API elements (not just generic terms like "graphql" or "Address")
3. When search finds matches, you MUST read the file sections to verify if the usage will break
4. Search for exact field names, endpoint paths, query/mutation names - be specific, not generic
5. Continue searching until you have checked ALL backend changes - do not stop early

EFFICIENCY:
- Search for EXACT API elements from backend changes (exact field names, endpoint paths, query names) - NOT generic terms
- When grep finds matches, you MUST read the file sections to verify breaking usage - don't assume from search results alone
- Get code context efficiently: Use grep with context flags (grep -C 10 "pattern" file) to get code around matches instead of reading large line ranges
- Only read specific line ranges when you need more context than grep -C provides - keep ranges small (50-100 lines max)
- DO NOT use "head -n" to limit grep results - it may hide important matches. If results are too long, search more specifically instead
- Large files (e.g., 15K+ line GraphQL schemas): ALWAYS use grep with context or read small specific sections, never readFile entire file or large ranges
- Do not repeat searches - if you already searched for a term, don't search again with different flags or patterns
- readFile is extremely expensive - when bash cannot provide the needed information. Should only be used for small files.

OUTPUT:
- frontendImpacts array with: backendChangeId, frontendRepo, file, apiElement, description (high-level summary), severity
- frontendRepo: MUST be a string in format "owner/repo:branch" (e.g., "${owner}/${repo}:${branch}"). This is REQUIRED for each impact - use the repository information provided.
- Focus on confirming that breaking impacts exist, not exhaustive enumeration
- CRITICAL: You MUST search for ALL backend changes before reporting results. Do not stop after checking only a few changes.
- Return empty array ONLY if you have searched for ALL backend changes and found no breaking impacts`;
}
