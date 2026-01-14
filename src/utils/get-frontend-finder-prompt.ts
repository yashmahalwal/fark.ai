import { FrontendFinderInput } from "../agents/frontend-finder";

/**
 * Generates the prompt for the Frontend Impact Finder agent
 * @param input - Frontend finder input containing frontend repo and backend changes
 * @returns The complete prompt string for the finder
 */
export function getFrontendFinderPrompt(input: FrontendFinderInput): string {
  const { frontendRepo, backendChanges } = input;
  const { owner, repo, branch } = frontendRepo;

  return `Find ALL frontend code in ${owner}/${repo} (branch: ${branch}) impacted by these backend API changes:

${JSON.stringify(backendChanges.backendChanges, null, 2)}

AVAILABLE TOOLS:
- get_file_contents: Read repository files (can read specific line ranges)
- search_code: Search for code patterns across the repository

EFFICIENCY CONSTRAINTS - AVOID READING UNNECESSARY DATA:
Files can be LARGE - read efficiently:
- Read files in chunks/sections (specific line ranges) rather than entire files
- Use search_code to locate specific API elements before reading files - this narrows down what to read
- Explore file structure when needed to understand repository organization
- Use search_code to find where API elements are used before reading files

CRITICAL: You MUST find ALL impacts across the complete codebase - search comprehensively but efficiently.

PROCESS:
1. For EACH backend change:
   - Extract API elements to search for from impact, description and diffHunks:
     * fieldRenamed/fieldRemoved/fieldAdded → extract field name
     * endpointChanged → extract endpoint path
     * parameterAdded/parameterRemoved → extract parameter name
     * typeChanged → extract field name
     * statusCodeChanged → extract endpoint path
     * enumValueAdded/enumValueRemoved → extract enum name and value
     * nullableToRequired/requiredToNullable → extract field name
     * arrayStructureChanged/objectStructureChanged → extract field name
     * defaultValueChanged → extract field name
     * unionTypeExtended → extract field name
     * other → parse description for API element
   
2. Search for references efficiently:
   - Use search_code to find where each API element is used across the entire codebase
   - Use search_code to narrow down which files contain relevant API code before reading them
   - For each search match found, read only the specific line range around the match (not entire files)
   - If search result is clear enough, you may not need to read the file at all
   - Explore file structure when needed to understand repository organization
   - Read files in chunks (specific line ranges) rather than entire files
   - CRITICAL: Search comprehensively to find ALL impacts - do not stop after finding one match

3. For each impact found, output:
   - backendChangeId: The id from the backend change that caused this impact (from backendChanges[].id)
   - file: File path where impact occurs
   - codeHunk: Object with:
     * startLine: Starting line number of the code section
     * endLine: Ending line number of the code section
     * code: The actual code snippet from startLine to endLine (read from file contents)
   - apiElement: The specific API element being referenced (e.g., "User.email", "/api/users", "OrderStatus.PENDING")
   - description: Clear description of how this backend change impacts the frontend code at this location
   - severity: "high" (breaking - causes crashes/failures), "medium" (may break), "low" (minor issue)

OUTPUT STRUCTURE:
- Return an object with frontendImpacts array
- Each entry in frontendImpacts represents ONE impact location
- If the same API element appears in multiple files/locations, create separate entries
- Return empty frontendImpacts array only if NO impacts found after thorough search

CRITICAL: You MUST find ALL impacts. Search comprehensively - do not stop after finding one.

IMPORTANT: Do NOT give up early or return empty results prematurely. Continue searching until you have:
- Searched for ALL API elements from ALL backend changes using search_code
- Tried multiple search patterns/variations for each API element (e.g., field name, camelCase, snake_case, full path)
- Read files where matches were found to verify impacts
- Explored related files if initial searches don't find matches (check imports, type definitions, API clients)
- Verified each potential impact before including it
- Only return empty frontendImpacts array if you've EXHAUSTIVELY searched ALL possible variations and found ABSOLUTELY NO impacts

DO NOT STOP SEARCHING UNTIL:
1. You have searched for every API element from every backend change
2. You have tried different search patterns (exact match, partial match, related terms)
3. You have checked common locations (API clients, GraphQL queries, REST calls, type definitions, models)
4. You are CERTAIN there are no impacts

If you're approaching token or step limits, include ALL impacts you've found so far in your output - do not return empty array unless you've completed an exhaustive search of ALL backend changes and ALL possible search patterns.`;
}
