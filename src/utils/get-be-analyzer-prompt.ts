import { BackendInput } from "../agents/be-analyzer";

/**
 * Generates the prompt for the BE Diff Analyzer agent
 * @param input - Backend input containing owner, repo, and pull_number
 * @returns The complete prompt string for the analyzer
 */
export function getBeAnalyzerPrompt(input: BackendInput): string {
  const { backend } = input;
  const { owner, repo, pull_number } = backend;

  return `Analyze PR #${pull_number} in ${owner}/${repo} to identify ALL breaking API interface changes.

CONSTRAINTS:
- Focus on API INTERFACE changes (REST routes, GraphQL schema, gRPC proto) - NOT internal files
- Read internal changes to understand API impact, but report only at API interface level

WORKFLOW:
1. Get changed files: pull_request_read method="get_files", owner="${owner}", repo="${repo}", pullNumber=${pull_number}
2. Get PR diff (CRITICAL): pull_request_read method="get_diff", owner="${owner}", repo="${repo}", pullNumber=${pull_number}
3. Analyze diff for API interface files (routes, controllers, schemas, proto) - identify breaking changes
4. Analyze diff for internal files (models, types) - trace impact to API interfaces
5. Use get_file_contents when diff needs more context (read line ranges, not entire files)
6. Use search_code to find where internal types are used in API endpoints

EFFICIENCY: Skip unrelated files (tests, docs, build configs). Avoid reading large files/diffs - focus on relevant sections only. Don't read entire files when line ranges suffice.

TOOLS:
- pull_request_read: get_files (list changed files), get_diff (PR diff - PRIMARY tool), get (PR metadata)
- get_file_contents: Read files in chunks when diff lacks context
- search_code: Find API endpoints using changed internal types

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
- One entry per breaking change (id: "0", "1", "2", etc.)
- Populate structured fields from diff (oldFieldName, newFieldName, fieldName, endpointPath, enumName, enumValue, etc.)
- Explain HOW it breaks from client perspective
- Use internal changes to explain WHY (e.g., "Internal User.email renamed → REST /users returns 'emailAddress'")
- Continue until ALL API interface changes analyzed

If no breaking changes found, return empty backendChanges array.`;
}
