import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod/v3";

// Shared backend repository schema
export const backendRepoSchema = z.object({
  owner: z.string().describe("Repository owner"),
  repo: z.string().describe("Repository name"),
  pull_number: z.number().describe("Pull request number"),
});

// Input schema
const backendInputSchema = z.object({
  backend: backendRepoSchema,
});

// Shared backend change item schema
export const backendChangeItemSchema = z.object({
  file: z.string().describe("File path where the change occurred"),
  diffHunks: z.array(
    z.object({
      startLine: z.number().describe("Starting line number in the diff"),
      endLine: z.number().describe("Ending line number in the diff"),
      changes: z.array(z.string()).describe("Array of diff lines"),
    }),
  ),
  impact: z
    .enum([
      "fieldRenamed",
      "fieldRemoved",
      "fieldAdded",
      "endpointChanged",
      "parameterAdded",
      "parameterRemoved",
      "typeChanged",
      "statusCodeChanged",
      "enumValueAdded",
      "enumValueRemoved",
      "nullableToRequired",
      "requiredToNullable",
      "arrayStructureChanged",
      "objectStructureChanged",
      "defaultValueChanged",
      "unionTypeExtended",
      "other",
    ])
    .describe("Type of API breaking change"),
  description: z.string().describe("Human-readable description of the change"),
  // Structured fields for easier frontend searching
  oldFieldName: z
    .string()
    .optional()
    .describe("Old field name (for fieldRenamed, fieldRemoved)"),
  newFieldName: z
    .string()
    .optional()
    .describe("New field name (for fieldRenamed, fieldAdded)"),
  fieldName: z
    .string()
    .optional()
    .describe("Field name (for fieldRemoved, fieldAdded, typeChanged)"),
  endpointPath: z
    .string()
    .optional()
    .describe("Endpoint path (for endpointChanged)"),
  oldEndpointPath: z
    .string()
    .optional()
    .describe("Old endpoint path (for endpointChanged)"),
  newEndpointPath: z
    .string()
    .optional()
    .describe("New endpoint path (for endpointChanged)"),
  parameterName: z
    .string()
    .optional()
    .describe("Parameter name (for parameterAdded, parameterRemoved)"),
  oldType: z.string().optional().describe("Old type/value (for typeChanged)"),
  newType: z.string().optional().describe("New type/value (for typeChanged)"),
  oldStatusCode: z
    .number()
    .optional()
    .describe("Old status code (for statusCodeChanged)"),
  newStatusCode: z
    .number()
    .optional()
    .describe("New status code (for statusCodeChanged)"),
  enumName: z
    .string()
    .optional()
    .describe("Enum name (for enumValueAdded, enumValueRemoved)"),
  enumValue: z
    .string()
    .optional()
    .describe("Enum value (for enumValueAdded, enumValueRemoved)"),
  wasNullable: z
    .boolean()
    .optional()
    .describe("Whether field was nullable before (for nullableToRequired)"),
  isNowNullable: z
    .boolean()
    .optional()
    .describe("Whether field is now nullable (for requiredToNullable)"),
  oldArrayStructure: z
    .string()
    .optional()
    .describe("Old array structure description (for arrayStructureChanged)"),
  newArrayStructure: z
    .string()
    .optional()
    .describe("New array structure description (for arrayStructureChanged)"),
  oldObjectStructure: z
    .string()
    .optional()
    .describe("Old object structure description (for objectStructureChanged)"),
  newObjectStructure: z
    .string()
    .optional()
    .describe("New object structure description (for objectStructureChanged)"),
  oldDefaultValue: z
    .string()
    .optional()
    .describe("Old default value (for defaultValueChanged)"),
  newDefaultValue: z
    .string()
    .optional()
    .describe("New default value (for defaultValueChanged)"),
  newUnionType: z
    .string()
    .optional()
    .describe("New type added to union (for unionTypeExtended)"),
});

// Output schema
export const backendChangesSchema = z.object({
  backendChanges: z.array(backendChangeItemSchema),
});

type BackendInput = z.infer<typeof backendInputSchema>;
type BackendChangesOutput = z.infer<typeof backendChangesSchema>;

/**
 * Agent 1: BE Diff Analyzer
 * Extracts API interface changes from PR diff using GitHub MCP tools and OpenAI reasoning
 */
export async function analyzeBackendDiff(
  input: BackendInput,
  tools: Record<string, any>,
  openaiApiKey: string,
): Promise<BackendChangesOutput> {
  // Validate inputs
  if (!input) {
    throw new Error("Input is required");
  }

  if (!input.backend) {
    throw new Error("Input.backend is required");
  }

  if (!input.backend.owner || typeof input.backend.owner !== "string") {
    throw new Error("Input.backend.owner is required and must be a string");
  }

  if (!input.backend.repo || typeof input.backend.repo !== "string") {
    throw new Error("Input.backend.repo is required and must be a string");
  }

  if (
    typeof input.backend.pull_number !== "number" ||
    input.backend.pull_number <= 0
  ) {
    throw new Error(
      "Input.backend.pull_number is required and must be a positive number",
    );
  }

  if (!tools || Object.keys(tools).length === 0) {
    throw new Error("Tools are required and must not be empty");
  }

  if (
    !openaiApiKey ||
    typeof openaiApiKey !== "string" ||
    openaiApiKey.trim().length === 0
  ) {
    throw new Error(
      "OpenAI API key is required and must be a non-empty string",
    );
  }

  const { backend } = input;

  const prompt = `Analyze pull request #${backend.pull_number} in ${backend.owner}/${backend.repo} to identify breaking API interface changes.

CRITICAL: Backend repos can be massive, but changes are usually small. Only work with API-relevant changes, not the entire diff or API interface.

Process:
1. Get the list of changed file names from the PR
2. Explore the file names to identify which ones are API-related (e.g., routes, controllers, API handlers, request/response schemas, API definitions)
3. For API-related files only, read the diff and extract ONLY the changes that affect the API interface:
   - Request/response object field changes (renames, removals, additions)
   - Endpoint path changes
   - Parameter changes
   - Type changes affecting serialization
   - Status code changes
   - Enum value additions/removals (critical for strictly compiled languages - causes deserialization failures)
   - Nullable/required field changes (nullable to required breaks clients expecting optional fields)
   - Array/object structure changes (breaks deserialization)
   - Default value changes
   - Union type extensions
4. If additional context is needed, read only the specific relevant files. If possible read only parts of the files since schema files can be massive.

For each API change detected, populate the relevant optional structured fields when available from the diff:
- oldFieldName (optional): Old field name for fieldRenamed or fieldRemoved
- newFieldName (optional): New field name for fieldRenamed or fieldAdded
- fieldName (optional): Field name for fieldRemoved, fieldAdded, typeChanged, nullableToRequired, requiredToNullable, arrayStructureChanged, objectStructureChanged, defaultValueChanged
- endpointPath (optional): Endpoint path (if unchanged base path)
- oldEndpointPath (optional): Old endpoint path for endpointChanged
- newEndpointPath (optional): New endpoint path for endpointChanged
- parameterName (optional): Parameter name for parameterAdded or parameterRemoved
- oldType (optional): Old type/value for typeChanged
- newType (optional): New type/value for typeChanged
- oldStatusCode (optional): Old status code for statusCodeChanged
- newStatusCode (optional): New status code for statusCodeChanged
- enumName (optional): Enum name for enumValueAdded or enumValueRemoved
- enumValue (optional): Enum value for enumValueAdded or enumValueRemoved
- wasNullable (optional): Whether field was nullable before for nullableToRequired
- isNowNullable (optional): Whether field is now nullable for requiredToNullable
- oldArrayStructure (optional): Old array structure for arrayStructureChanged
- newArrayStructure (optional): New array structure for arrayStructureChanged
- oldObjectStructure (optional): Old object structure for objectStructureChanged
- newObjectStructure (optional): New object structure for objectStructureChanged
- oldDefaultValue (optional): Old default value for defaultValueChanged
- newDefaultValue (optional): New default value for defaultValueChanged
- newUnionType (optional): New type added to union for unionTypeExtended

CRITICAL: Detect derived/indirect breaking changes that cause deserialization failures in strictly compiled languages:
- enumValueAdded: Adding enum values breaks strictly compiled clients (Swift enums, Kotlin sealed classes, TypeScript strict enums, Rust enums, Go constants) - causes deserialization failures when client doesn't handle the new value. JavaScript clients are unaffected.
- enumValueRemoved: Removing enum values breaks clients that reference the removed value (switch/case, when expressions fail)
- nullableToRequired: Making a field required breaks clients that don't provide it (deserialization fails when required field is missing)
- requiredToNullable: Can break clients that expect non-null values (type system errors, null pointer exceptions)
- arrayStructureChanged: Changing array to single value or vice versa breaks deserialization (type mismatch)
- objectStructureChanged: Nested object becoming flat or structure changes break deserialization (property mapping fails)
- defaultValueChanged: Can break clients relying on old default values (business logic assumes different defaults)
- unionTypeExtended: Adding new types to union breaks strictly typed clients (sealed classes, discriminated unions fail to deserialize)

The key difference: JavaScript/loosely typed languages are flexible, but strictly compiled languages (TypeScript strict, Swift, Kotlin, Rust, Go, etc.) will fail during deserialization when the schema doesn't match exactly.

Populate these fields when the information is available from the diff. They help the frontend agents search more efficiently, especially for strictly typed client codebases.

IMPORTANT CONSTRAINTS:
- Do NOT read the complete diff - only extract API-relevant changes from the diff
- Do NOT read all files - only necessary files or sections when context is needed
- Do NOT reconstruct the complete API interface - focus only on what changed
- Focus on what CHANGED that affects the API contract
- Extract diff hunk line numbers and changes from the relevant portions only

Note: The above list covers common breaking change patterns, but you should also detect any other API-breaking changes not explicitly listed above. Use the "other" impact type for novel breaking change patterns that don't fit the standard categories, but still provide a clear description and populate relevant structured fields when available.
If no API-relevant breaking changes are detected, return an empty backendChanges array.`;

  const openaiClient = createOpenAI({ apiKey: openaiApiKey });

  const outputSpec = Output.object({
    schema: backendChangesSchema,
  });

  const result = await generateText({
    model: openaiClient("gpt-4o"),
    output: outputSpec,
    tools,
    prompt,
  });

  if (!result.output) {
    throw new Error("Failed to generate structured output from the model");
  }

  return result.output as BackendChangesOutput;
}
