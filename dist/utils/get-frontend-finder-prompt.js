"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFrontendFinderPrompt = getFrontendFinderPrompt;
/**
 * Generates the prompt for the Frontend Impact Finder agent
 * @param input - Frontend finder input containing frontend repo and backend changes
 * @returns The complete prompt string for the finder
 */
function getFrontendFinderPrompt(input) {
    const { repository, backendBatch, codebasePath } = input;
    const { owner, repo, branch } = repository;
    // Extract only essential information from backend changes (exclude large diffHunks)
    const essentialChanges = backendBatch.changes.map((change) => ({
        id: change.id,
        file: change.file,
        impact: change.impact,
        description: change.description,
    }));
    return `Analyze the frontend codebase to identify where these backend API changes will BREAK the frontend code.

Codebase path: ${codebasePath}
Backend API changes batch: ${backendBatch.description}
Backend API changes to analyze:
${JSON.stringify(essentialChanges)}

CONSTRAINTS:
- Only report impacts where the backend change will ACTUALLY BREAK the frontend code
- The codebase is checked out at ${codebasePath}; cwd is already that directory. Use RELATIVE paths only (e.g. "." or a discovered source folder) in bash and readFile.

TOOLS:
- bash: cwd = codebase root. Prefer relative paths
- readFile: Use ONLY as last resort. Pass path relative to codebase root (e.g. path/to/file.ext).

BASH COMMANDS (intent, not recipes):
- Paths:
  - Start from "." (repo root). After you know where the real source code lives (from a minimal amount of ls/grep), prefer searching those source directories instead of the entire tree.
  - Avoid dependency, build/output folders (e.g. node_modules, .git, dist, build, coverage, out, etc.) and other junk folders. Focus on source code.
- Searching:
  - Use recursive grep or ripgrep (rg) to search for relevant identifiers from the backend changes.
  - Never use grep’s -I/--binary-files=without-match flags; they can silently hide matches in files the tool thinks are “binary”.
  - Keep output small by using small context and pagination; do not try to dump the whole codebase.
- Other commands:
  - Use sed or similar only to read small, specific ranges around matches; do not read huge file ranges.
  - For any bash command that can stream a lot of text (grep, cat, find without predicates, etc.), always apply some limit/pagination (e.g. head -n N) so you never flood the context window.
  - Avoid complex shell tricks; simple, robust commands are preferred.

WORKFLOW AND RULES (high level):
- First, build a focused search plan:
  - Read and understand ALL backend change descriptions in this batch before running any tools.
  - Decide which concrete identifiers to search for (field names, endpoint paths, operation/query names).
  - Deduplicate so each identifier is searched once and reused across all related changes.
- Search real source code, not junk:
  - Run recursive searches from "." (and, if clearly helpful, a small number of obvious source roots).
  - Avoid dependency/build/output folders such as node_modules, .git, dist, build, coverage, out, etc.
- Keep searches small and informative:
  - Use grep (or equivalent) with small context and pagination so you can see how an identifier is used without dumping whole files or the entire tree.
  - Only drill deeper (more context or additional reads) when a usage actually looks like it could BREAK the frontend.
- Use ls only to choose where to search:
  - Run ls rarely, only when it helps you understand the top-level layout or pick good roots to search.
  - Do not walk the tree with repeated ls/cd/find; rely on grep results and filenames to guide you.
- Avoid low-signal searches:
  - Do not search extremely generic terms or loose subfields alone that will match everywhere; prefer specific identifiers tied directly to the backend changes.
- Avoid repeating the same work:
  - Use what prior tool results in this turn already showed: which identifiers, paths, and files were searched or read, and reuse that evidence instead of repeating the same probe.
  - Do not re-run essentially the same grep/rg/sed/ls/find commands with only minor variations if they target the same identifier and scope; reuse prior results instead.
- Report impacts, not every match:
  - For each confirmed breaking usage, link it back to the specific backend change(s) it depends on.
  - You do not need to enumerate every occurrence once you have demonstrated the breaking pattern; exhaustive listing of duplicate hits is not required.

OUTPUT:
- frontendImpacts array with: backendBatchId, backendChangeId, frontendRepo, file, apiElement, description (high-level summary), severity
- backendBatchId: MUST be "${backendBatch.batchId}" (the batch ID from the input)
- backendChangeId: MUST match the change.id from the backend changes being analyzed
- frontendRepo: MUST be a string in format "owner/repo:branch" (e.g., "${owner}/${repo}:${branch}"). This is REQUIRED for each impact - use the repository information provided.
- Focus on confirming that breaking impacts exist, not exhaustive enumeration of every grep hit
- CRITICAL: You MUST consider and search for every backend change id in THIS batch before reporting results (that obligation is separate from listing every duplicate match). Do not stop after checking only a few changes. Do not report "no matches" if the command might have been wrong (e.g. brace expansion in --include) or you are unsure.
- Return empty array ONLY if you have searched for ALL changes in THIS batch and found no breaking impacts`;
}
//# sourceMappingURL=get-frontend-finder-prompt.js.map