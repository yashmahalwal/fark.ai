"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBeAnalyzerPrompt = getBeAnalyzerPrompt;
/**
 * Generates the prompt for the BE Diff Analyzer agent
 * @param input - Backend input (repository, codebasePath, githubMcp, options)
 * @returns The complete prompt string for the analyzer
 */
function getBeAnalyzerPrompt(input) {
    const { repository, codebasePath } = input;
    const { owner, repo, pull_number } = repository;
    return `Analyze PR #${pull_number} in ${owner}/${repo} to identify ALL breaking API interface changes.

Backend codebase path: ${codebasePath}
The backend repo is checked out here; cwd for bash is this directory. Use RELATIVE paths only in bash and readFile.

CONSTRAINTS:
- Focus on API INTERFACE changes (REST routes, GraphQL schema, gRPC proto)
- Do not report internal only changes. If an internal change affects API surface, report it.

TOOLS:
- pull_request_read: get_diff, get_files, get (PR metadata) - Use ONLY for PR operations. Prefer get_diff first; call get_files or get only when the diff alone is insufficient (e.g. incomplete file list, need PR metadata).
- bash: Use for codebase traversal, searching, and reading file sections
- readFile: Use ONLY as last resort when bash cannot provide the needed information

WORKFLOW (ADAPTIVE - NO FIXED ORDER):
- Use PR data and codebase tools as needed to determine API-surface impact.
- It is OK if diff alone is sufficient; do not unnecessarily load extra file contents, PR metadata, or full file listings beyond what you need.
- When internal changes exist, verify whether they impact API surface (routes/controllers/schema/proto) and report all the related impacts consolidated at the API level.
- Use bash to search and read sections only when PR data is insufficient to connect the impact.
- DO NOT use ls, find, or directory listing unless absolutely necessary - rely on diff and search results for file paths.
- DO NOT use any git operations — the working tree on disk is already the PR branch checkout.

EFFICIENCY (CRITICAL FOR TOKEN PRESERVATION):
- The diff often contains most information you need - rely on it first
- When you need to read files: Use bash for file operations - search reveals file paths and line numbers, then read only the relevant sections
- Example: grep -rn "pattern" . shows file:line:match - use the line numbers to read specific ranges (e.g., sed -n '100,200p' file) instead of reading entire files
- When using bash to read from the codebase, avoid obvious junk folders (e.g., node_modules, .git, dist, build, coverage, out, etc.)
- For any bash command that can stream a lot of text (grep, cat, find without predicates, etc.), always keep output paginated/bounded (e.g., head -n N or small sed ranges) so you never dump whole large files into the context
- Never use grep's -I/--binary-files=without-match flags - they can silently hide matches in files the tool thinks are "binary"
- Large files (e.g., 15K+ line GraphQL schemas): ALWAYS use bash to read specific sections, never readFile entire file
- Skip unrelated files (tests, docs, build configs)

BREAKING CHANGE TYPES:

fieldRenamed: Field renamed - populate oldFieldName, newFieldName
fieldRemoved: Field removed - populate fieldName/oldFieldName
fieldAdded: Required field added - populate newFieldName/fieldName
endpointChanged: Endpoint path changed - populate oldEndpointPath, newEndpointPath
parameterAdded: Required parameter added - populate parameterName
parameterRemoved: Parameter removed - populate parameterName
typeChanged: Field type changed - populate fieldName, oldType, newType
statusCodeChanged: Status code changed - populate oldStatusCode, newStatusCode
enumValueAdded: Enum value added - populate enumName, enumValue. CRITICAL: Breaks compiled clients (Swift, Kotlin, TypeScript strict, Rust, Go) - causes deserialization failures
enumValueRemoved: Enum value removed - populate enumName, enumValue
nullableToRequired: Field became required - populate fieldName, wasNullable
requiredToNullable: Field became nullable - populate fieldName, isNowNullable
arrayStructureChanged: Array structure changed - populate fieldName, oldArrayStructure, newArrayStructure
objectStructureChanged: Object structure changed - populate fieldName, oldObjectStructure, newObjectStructure
defaultValueChanged: Default value changed - populate fieldName, oldDefaultValue, newDefaultValue
unionTypeExtended: Union type extended - populate fieldName, newUnionType
other: Any other breaking change - provide clear description

Note: Compiled languages (TypeScript strict, Swift, Kotlin, Rust, Go) fail on deserialization mismatches. JavaScript is flexible.

OUTPUT:
- Reporting (each breaking change):
  - Report ONLY at API interface level (file: routes.ts, schema.ts, *.proto, NOT models.ts, types.ts)
  - One entry per breaking change; assign \`change.id\` as unique strings indexed sequentially (e.g. "0", "1", "2", …) and unique across all batches
  - Populate structured fields from diff (oldFieldName, newFieldName, fieldName, endpointPath, enumName, enumValue, etc.)
  - Explain HOW it breaks from client perspective
  - Use internal changes to explain WHY (e.g., "Internal User.email renamed → REST /users returns 'emailAddress'")
  - Continue until ALL API interface changes analyzed

DIFF HUNK LINE NUMBERS:
Parse diff hunks to extract startLine, endLine, startSide, endSide:

Example 1 - Single-line addition:
  "@@ -57,6 +57,7 @@ export const resolvers = {
             if (err) return reject(err);
             if (!row) return resolve(null);
  
+            const addressData = JSON.parse(row.shipping_address || "{}");
             resolve({
  "
  Result: startLine = 60, endLine = 60, startSide = "RIGHT", endSide = "RIGHT"

Example 2 - Multi-line change (removal + addition):
  "@@ -64,7 +65,16 @@ export const resolvers = {
               status: row.status,
               total: row.total,
               discountCode: row.discount_code,
-              shippingAddress: JSON.parse(row.shipping_address || "{}"),
+              shippingAddress: {
+                location: {
+                  street: addressData.location?.street || addressData.street || "",
+                  city: addressData.location?.city || addressData.city || "",
+                },
+                postal: {
+                  zipCode: addressData.postal?.zipCode || addressData.zipCode || "",
+                  country: addressData.postal?.country || addressData.country || "",
+                },
+              },
  "
  Result: startLine = 67, endLine = 77, startSide = "LEFT", endSide = "RIGHT"

Logic:
- Lines with "+" = RIGHT side (new file), count from "+new_start"
- Lines with "-" = LEFT side (old file), count from "-old_start"
- Pure addition (only "+" lines): startSide = "RIGHT", endSide = "RIGHT"
- Pure removal (only "-" lines): startSide = "LEFT", endSide = "LEFT"
- Mixed (both "-" and "+" lines): startLine = first removed line (LEFT), endLine = last added line (RIGHT), startSide = "LEFT", endSide = "RIGHT"
- Stick to diff lines (lines with "+" or "-" prefix) - startLine/endLine should be the exact changed lines

Output shape — granularity and batches:
- Use an **optimal** number of \`change\` entries: not so few that unrelated breaks are lumped together, and not so many that the same break is scattered across redundant rows. Aim between those extremes.
- BATCHING:
  - Group related changes together—the frontend finder needs coherent batches to analyze effectively
  - Each batch's content must fit within context window (total content: diffHunks, descriptions, etc.)
  - The frontend impact agent runs once per batch, so keep batch count low
  - Batches are mutually exclusive—each change belongs to exactly one batch
- batches: Array of batches, each containing:
  - batchId: Unique identifier
  - description: Brief description of the batch
  - changes: Array of backend changes (each change.id must be unique across all batches)
- All changes must be included in exactly one batch

If no breaking changes found, return empty batches array.`;
}
//# sourceMappingURL=get-be-analyzer-prompt.js.map