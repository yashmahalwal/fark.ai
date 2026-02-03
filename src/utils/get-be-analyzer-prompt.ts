import { BackendInput } from "../schemas/be-analyzer-schema";

/**
 * Generates the prompt for the BE Diff Analyzer agent
 * @param input - Backend input containing owner, repo, and pull_number
 * @returns The complete prompt string for the analyzer
 */
export function getBeAnalyzerPrompt(input: BackendInput): string {
  const { repository } = input;
  const { owner, repo, pull_number } = repository;

  return `Analyze PR #${pull_number} in ${owner}/${repo} to identify ALL breaking API interface changes.

CONSTRAINTS:
- Focus on API INTERFACE changes (REST routes, GraphQL schema, gRPC proto)
- Do not report internal only changes.If an internal change affects API surface, report it.

TOOLS:
- pull_request_read: get_diff, get_files, get (PR metadata) - Use ONLY for PR operations
- bash: Use for codebase traversal, searching, and reading file sections
- readFile: Use ONLY as last resort when bash cannot provide the needed information

WORKFLOW (ADAPTIVE - NO FIXED ORDER):
- Use PR data and codebase tools as needed to determine API-surface impact.
- It is OK if diff alone is sufficient; do not read files unnecessarily.
- When internal changes exist, verify whether they impact API surface (routes/controllers/schema/proto) and report all the related impacts consolidated at the API level.
- Use bash to search and read sections only when PR data is insufficient to connect the impact.
- DO NOT use ls, find, or directory listing unless absolutely necessary - rely on diff and search results for file paths.
- DO NOT use any git operations - codebase is already available at the provided path.

EFFICIENCY (CRITICAL FOR TOKEN PRESERVATION):
- Prefer PR diff over filesystem:
  - The diff often contains most information you need - rely on it first.
  - Only drop down to the checked-out codebase when diff + PR metadata are not enough to understand the API-surface impact.
- When you need to read files from the codebase:
  - Use bash to search first (for example, recursive grep/rg) to reveal file paths and line numbers, then read only the relevant sections.
  - Always keep reads bounded: use small line ranges (for example, sed -n '100,200p' file) or pagination (for example, head -n N); never stream whole large files.
  - Avoid dependency/build/output/junk folders such as node_modules, .git, dist, build, coverage, out, etc. unless there is a very specific reason.
  - Never use grep’s -I/--binary-files=without-match flags; they can silently hide matches in files the tool thinks are “binary”.
- Discovery vs traversal:
  - Use a minimal amount of ls/search output to understand layout and locate relevant code roots; do not walk the tree with ls/find.
  - Skip unrelated files (tests, docs, build configs) unless they clearly participate in the public API.
- Be targeted:
  - Focus searches on API-surface files (routes/controllers, schemas, protos) rather than broad filesystem traversal.
  - Avoid excessive or repeated searches; reuse information from earlier searches whenever possible.

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
- Report ONLY at API interface level (file: routes.ts, schema.ts, *.proto, NOT models.ts, types.ts)
- One entry per breaking change (id: "1", "2", "3", etc.)
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

OUTPUT:
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
