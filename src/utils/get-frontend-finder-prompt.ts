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

CRITICAL: Only report impacts where the backend change will ACTUALLY BREAK the frontend code. Use the backend change's impact type and description to determine if frontend code is affected.

WORKFLOW:
1. Extract unique API terms from ALL backend changes (impact type, description, diffHunks)
2. For each unique API term, search ONCE using specific terms (e.g., "User.email" not "email")
3. CRITICAL: After EVERY search_code call:
   - Check if it returned any results (files/matches)
   - If results exist: You MUST call get_file_contents to read those files BEFORE proceeding
   - Do NOT make another search_code call until you've read and analyzed files from the previous search
   - You CANNOT determine if there are impacts without reading the files
4. Analyze each file against backend changes to determine if it breaks
5. Only after reading ALL files where search_code found matches, output impacts with: backendChangeId, file, apiElement, description, severity

SEARCH RULES:
- Search each unique API term ONCE - do not repeat or search variations (e.g., if you searched "orders", don't search "order" or "Order")
- Do not search overly broad terms (e.g., "fetch(" or "axios")
- If search returns no results, move to next term - don't try variations
- Track what you've searched to avoid redundant work

FILE READING:
- Read ONLY files returned by search_code (use line ranges when possible, entire files only if needed)
- Do NOT explore directories or file structures - only read specific files where matches were found
- Do NOT call get_file_contents on directories (exception: only when absolutely necessary)
- Do NOT explore related files, imports, or implementation details

ANALYSIS:
- Use backend change description directly - it explains what changed
- Consider backward compatibility - changes breaking older clients are breaking, especially for compiled languages
- Determine if change breaks frontend code based on impact type and description
- Report each impact and move on - don't dig deeper

OUTPUT:
- Return object with frontendImpacts array
- Each entry: backendChangeId, file, apiElement, description (high-level), severity (high/medium/low)
- Return empty array only if no breaking impacts found after reading ALL files where search_code found matches

CRITICAL WORKFLOW RULE:
- Search → If results → MUST read files → Analyze → Then search next term
- You CANNOT skip reading files after search_code returns results
- You CANNOT output 0 impacts without reading files where search_code found matches
- Complete search for all API terms, but be efficient - analyze at high level, don't explore implementation details.`;
}
