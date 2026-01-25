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

${JSON.stringify(backendChanges.backendChanges)}

CRITICAL: Only report impacts where the backend change will ACTUALLY BREAK the frontend code.

WORKFLOW:
1. Extract API elements: REST endpoints, GraphQL queries/mutations, field names, types/interfaces
2. Discover files: Read root directory ONCE to detect project type, then use smart navigation (see below)
3. Read a few relevant files: API clients, network layer, data models, serialization code, any code that uses backend API
4. Analyze: Check if backend changes break the frontend code
5. Output: High-level confirmation with summary of breaking impacts

SMART NAVIGATION - CRITICAL FOR EFFICIENCY:
⚠️ DO NOT traverse directories recursively level-by-level. This wastes tokens and steps.

Strategy:
1. Read root directory (/) ONCE to detect project type (look for package.json, build.gradle, Podfile, etc.)
2. Based on project type, try these standard paths DIRECTLY (don't traverse to them):
   * Web (JS/TS): Try src/api/, src/services/, src/graphql/, src/api/rest.ts, src/api/graphql.ts
   * Android (Kotlin/Java): Try app/src/main/java/, app/src/main/graphql/, app/src/main/java/*/api/, app/src/main/java/*/network/
   * iOS (Swift): Try Sources/, Sources/*/Network/, Sources/*/API/, Sources/*/GraphQL/
3. If a standard path doesn't exist, try ONE level up (e.g., if app/src/main/java/ fails, try app/src/main/)
4. Read directory contents of successful paths to find specific files
5. Read 3-5 relevant files maximum - NOT entire directory trees
6. Once you find breaking impacts, analyze and output - don't keep searching

EFFICIENCY - STOP AFTER FINDING IMPACTS:
- Read root ONCE, then jump to standard paths directly
- Once you find files that will break, analyze them and output results - don't keep reading more files
- Goal: Confirm that breaking impacts exist, not to find every single breaking change
- Use line ranges when possible, read entire files only if needed
- Focus on API-related code only - skip tests, implementation details, unrelated code
- OPTIONAL: search_code available but unreliable (GitHub indexing incomplete, rate limits) - use as last resort only (a few times max - can give errors)
- ⚠️ Only return empty frontendImpacts array if you are CERTAIN after checking multiple files and locations - do not give up prematurely

DISCOVERY (Language-agnostic - works for any frontend: web, mobile, desktop):
- Look for: HTTP/network requests, API clients, data models, serialization/deserialization code, GraphQL queries
- File patterns to look for: *Api*.kt, *Client*.kt, *ViewModel*.kt, *api*.ts, *service*.ts, *graphql*.ts, *Network*.swift
- STOP after finding and analyzing some breaking impacts - don't read everything

OUTPUT:
- frontendImpacts array with: backendChangeId, frontendRepo, file, apiElement, description (high-level summary), severity
- frontendRepo: Must be a string in format "owner/repo:branch" (e.g., "${owner}/${repo}:${branch}"). Branch defaults to "main" if not specified.
- Focus on confirming that breaking impacts exist, not exhaustive enumeration
- Return empty array only if no impacts found after checking a reasonable sample of files`;
}
