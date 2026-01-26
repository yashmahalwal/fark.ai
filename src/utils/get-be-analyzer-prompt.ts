import { BackendInput } from "../agents/be-analyzer";

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
- The diff often contains most information you need - rely on it first
- When you need to read files: Use bash for file operations - search reveals file paths and line numbers, then read only the relevant sections
- Example: grep -rn "pattern" . shows file:line:match - use the line numbers to read specific ranges (e.g., sed -n '100,200p' file) instead of reading entire files
- DO NOT use ls, find, or directory listing unless absolutely necessary - diff and search already reveal file paths
- Large files (e.g., 15K+ line GraphQL schemas): ALWAYS use bash to read specific sections, never readFile entire file
- readFile is extremely expensive - use only for small files when bash section reading is not practical
- Skip unrelated files (tests, docs, build configs)
- Be targeted in your searches - don't traverse excessively

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

If no breaking changes found, return empty backendChanges array.`;
}
