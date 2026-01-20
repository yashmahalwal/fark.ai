import { FrontendFinderInput } from "../agents/frontend-finder";

/**
 * Generates the prompt for the Frontend Impact Finder agent
 * @param input - Frontend finder input containing frontend repo and backend changes
 * @returns The complete prompt string for the finder
 */
export function getFrontendFinderPrompt(input: FrontendFinderInput): string {
  const { frontendRepo, backendChanges } = input;
  const { owner, repo, branch } = frontendRepo;

  return `Find frontend code in ${owner}/${repo} (branch: ${branch}) that will be BROKEN by these backend API changes:

${JSON.stringify(backendChanges.backendChanges, null, 2)}

CRITICAL: Only report impacts where the backend change will ACTUALLY BREAK the frontend code.

WORKFLOW:
1. Extract API elements: REST endpoints, GraphQL queries/mutations, field names, types/interfaces
2. Discover files: Read directory structure to understand codebase organization and find API-related code
3. Read a few relevant files: API clients, network layer, data models, serialization code, any code that uses backend API
4. Analyze: Check if backend changes break the frontend code
5. Output: High-level confirmation with summary of breaking impacts

EFFICIENCY - STOP AFTER FINDING IMPACTS:
- Read directory structure first, then read a few relevant files (not all files)
- Once you find files that will break, analyze them and output results - don't keep reading more files
- Goal: Confirm that breaking impacts exist, not to find every single breaking change
- Use line ranges when possible, read entire files only if needed
- Focus on API-related code only - skip tests, implementation details, unrelated code
- OPTIONAL: search_code available but unreliable (GitHub indexing incomplete, rate limits) - use sparingly, sequentially

DISCOVERY (Language-agnostic - works for any frontend: web, mobile, desktop):
- Common locations: api/, services/, network/, data/, models/, repositories/, clients/, http/, rest/, graphql/
- Look for: HTTP/network requests, API clients, data models, serialization/deserialization code, GraphQL queries
- Language-specific patterns:
  * Web (JS/TS): api/, services/, hooks/, stores/, components/
  * Android (Kotlin/Java): network/, api/, repositories/, data/, models/
  * iOS (Swift): network/, api/, services/, models/, repositories/
  * Any: files making HTTP requests, defining API contracts, serializing/deserializing API responses
- Process: Read directory listings → find a few relevant files → read files → analyze → report
- STOP after finding and analyzing some breaking impacts - don't read everything

OUTPUT:
- frontendImpacts array with: backendChangeId, frontendRepo, file, apiElement, description (high-level summary), severity
- frontendRepo: Must be a string in format "owner/repo:branch" (e.g., "${owner}/${repo}:${branch}"). Branch defaults to "main" if not specified.
- Focus on confirming that breaking impacts exist, not exhaustive enumeration
- Return empty array only if no impacts found after checking a reasonable sample of files`;
}
