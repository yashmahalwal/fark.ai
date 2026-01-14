import { BackendInput } from "../agents/be-analyzer";

/**
 * Generates the prompt for the BE Diff Analyzer agent
 * @param input - Backend input containing owner, repo, and pull_number
 * @returns The complete prompt string for the analyzer
 */
export function getBeAnalyzerPrompt(input: BackendInput): string {
  const { backend } = input;
  const { owner, repo, pull_number } = backend;

  return `Analyze pull request #${pull_number} in ${owner}/${repo} to identify ALL breaking API interface changes that affect client code.

CRITICAL CONSTRAINTS:
1. Focus on API INTERFACE changes (REST routes, GraphQL schema, gRPC proto) - NOT internal files
2. Internal changes (models, types, business logic) should be READ to understand API impact, but NOT reported as separate breaking changes

AVAILABLE TOOLS:
- pull_request_read: Read PR diff to see what changed
- get_file_contents: Read repository files (can read specific line ranges)
- search_code: Search for code patterns across the repository

EFFICIENCY CONSTRAINTS - AVOID READING UNNECESSARY DATA:
Diffs can be LARGE - do NOT read entire diffs blindly:
- First identify which files are API interface related (routes, controllers, schemas, proto files)
- Then read only the relevant parts of diffs for those files
- Skip reading diffs for clearly unrelated files (tests, docs, build configs)

Files can be LARGE - read efficiently:
- Read files in chunks/sections (specific line ranges) rather than entire files
- Use search_code to locate specific API elements before reading files
- Explore file structure when needed to understand organization
- Use search_code to narrow down which files contain relevant API code

Goal: Minimize tokens by avoiding reading unnecessary diffs and large files.

PROCESS:
1. Identify relevant files from the PR:
   - Use pull_request_read to get the list of ALL changed files
   - Identify which files are directly or indirectly related to API interface changes:
     * Direct API interface files: routes, controllers, API schemas, GraphQL schema, gRPC proto files
     * Indirect files: models, types, business logic, validation, serialization that affect API behavior
   - For API interface files: Read their diffs to understand what changed (read only relevant parts if diff is large)
   - For indirect files: Understand they affect API but don't read their diffs unless needed to trace API impact
   - Skip reading diffs for clearly unrelated files (tests, documentation, build configs, unless they affect API)

2. Read BE repository code files when needed:
   - Read actual repository code files when you need full context beyond the diff
   - Use search_code to locate where API elements are used before reading files - this narrows down what to read
   - Read files in chunks (specific line ranges) rather than entire files
   - Read both the changed files AND related files that use those types/models to understand the full impact
   - Read API interface files (routes, controllers, schemas) to see how internal changes propagate to the API
   - Read internal files (models, types, business logic) only when needed to understand how changes affect API behavior
   - IMPORTANT: Do NOT rely only on the PR diff - read the actual repository code files when you need to understand:
     * The full structure of types/models that changed
     * How changed types are used in API endpoints
     * What the API contract looks like before and after changes
     * Related files that might be affected

3. Identify API interface files and internal files:
   - API interface files: routes, controllers, API schemas, GraphQL schema, gRPC proto files
   - Internal files: models, types, business logic, internal utilities (read these to understand impact, but don't report them separately)
   
4. For API interface files, analyze the changes directly:
   - Read the actual API interface files using get_file_contents to see the full current state
   - Compare with the PR diff to understand what changed
   - Identify breaking changes in the API contract
   - Report these as breaking changes with the API interface file path
   
5. For internal files, trace the impact to API interfaces:
   - Read the actual internal files (models, types, etc.) using get_file_contents to see the full structure
   - Use search_code to find where these internal types are used in API endpoints
   - Read the API interface files that use these internal types to see how changes propagate
   - Trace how these changes affect API interfaces (which endpoints/schemas use these internal types)
   - Report the breaking change at the API interface level (routes, GraphQL schema, gRPC proto), NOT at the internal file level
   - Use internal changes to explain WHY the API changed in the description
   - Example: If internal model User.email is renamed, read the model file to confirm, then read routes.ts to see how it's used, then report it as "REST endpoint /users response field renamed" in routes.ts, not as "Internal model field renamed" in models.ts

6. Analyze ALL API interface changes:
   Direct interface changes:
   - Request/response object field changes (renames, removals, additions)
   - Endpoint path changes
   - Parameter changes
   - Type changes affecting serialization
   - Status code changes
   - Enum value additions/removals
   - Nullable/required field changes
   - Array/object structure changes
   - Default value changes
   - Union type extensions
   
   Changes that affect API interface (trace from internal code to API):
   - Internal model/type changes that propagate to API responses (report at API endpoint level)
   - Validation logic changes in API handlers that make previously valid requests invalid
   - Error handling changes in API handlers that change error response format or status codes
   - Serialization changes in API layer that modify output structure
   - Authentication/authorization changes in API middleware that affect access
   - Default value changes in API handlers that affect request/response behavior
   - Any internal change that ultimately changes what the API returns or accepts (report at API interface level)

BREAKING CHANGE SPECIFICATIONS:
fieldRenamed: A field in request/response was renamed. Populate oldFieldName and newFieldName. This breaks clients expecting the old field name.
fieldRemoved: A field was removed from request/response. Populate fieldName or oldFieldName. This breaks clients that expect or use this field.
fieldAdded: A new required field was added to request/response. Populate newFieldName or fieldName. This can break clients if the field is required in requests.
endpointChanged: The endpoint path changed. Populate oldEndpointPath and newEndpointPath. This breaks clients using the old path.
parameterAdded: A new required parameter was added. Populate parameterName. This breaks clients that don't provide it.
parameterRemoved: A parameter was removed. Populate parameterName. This breaks clients that send it.
typeChanged: A field's type changed. Populate fieldName, oldType, and newType. This breaks deserialization when types don't match.
statusCodeChanged: Response status code changed for an endpoint. Populate oldStatusCode and newStatusCode. This breaks clients expecting specific status codes.
enumValueAdded: A new enum value was added. Populate enumName and enumValue. CRITICAL: This breaks strictly compiled clients (Swift enums, Kotlin sealed classes, TypeScript strict enums, Rust enums, Go constants) - causes deserialization failures when client doesn't handle the new value. JavaScript clients are unaffected.
enumValueRemoved: An enum value was removed. Populate enumName and enumValue. This breaks clients that reference the removed value (switch/case, when expressions fail).
nullableToRequired: A field changed from nullable/optional to required. Populate fieldName and wasNullable. This breaks clients that don't provide it (deserialization fails when required field is missing).
requiredToNullable: A field changed from required to nullable/optional. Populate fieldName and isNowNullable. This can break clients that expect non-null values (type system errors, null pointer exceptions).
arrayStructureChanged: Array structure changed (e.g., array to single value or vice versa). Populate fieldName, oldArrayStructure, and newArrayStructure. This breaks deserialization (type mismatch).
objectStructureChanged: Object structure changed (e.g., nested object becoming flat). Populate fieldName, oldObjectStructure, and newObjectStructure. This breaks deserialization (property mapping fails).
defaultValueChanged: Default value changed. Populate fieldName, oldDefaultValue, and newDefaultValue. This can break clients relying on old default values (business logic assumes different defaults).
unionTypeExtended: A new type was added to a union. Populate fieldName and newUnionType. This breaks strictly typed clients (sealed classes, discriminated unions fail to deserialize).
other: Any other breaking change pattern. Provide clear description explaining how the change breaks the API.
The key difference: JavaScript/loosely typed languages are flexible, but strictly compiled languages (TypeScript strict, Swift, Kotlin, Rust, Go, etc.) will fail during deserialization when the schema doesn't match exactly.

OUTPUT REQUIREMENTS:
- Report breaking changes ONLY at the API interface level (file field must be routes.ts, schema.ts, *.proto, NOT models.ts, types.ts)
- Create a SEPARATE entry in backendChanges array for EACH distinct API breaking change
- For each entry, assign a unique id field: use the index as a string (first change: "0", second: "1", third: "2", etc.)
- If an API interface file has multiple breaking changes, create a separate entry for each one
- If the same API change appears in multiple API systems (REST, GraphQL, gRPC), create separate entries for each
- Use internal changes to explain the API change in the description (e.g., "Internal model User.email renamed, causing REST endpoint /users to return 'emailAddress' instead of 'email'")
- Explain HOW the change breaks the API from the client's perspective
- Populate structured fields (oldFieldName, newFieldName, fieldName, endpointPath, enumName, enumValue, etc.) when available from the diff
- Do NOT report internal model/type changes as separate breaking changes - only report their impact on API interfaces
- Do NOT stop after finding one change - continue until you've analyzed all API interface changes

If no API-relevant breaking changes are detected after thoroughly analyzing all changed files, return an empty backendChanges array.`;
}
