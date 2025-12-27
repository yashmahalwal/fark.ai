import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod/v3";
import { backendChangesSchema } from "./be-analyzer";

// Input schema
const frontendFinderInputSchema = z.object({
  frontendRepo: z.object({
    owner: z.string().describe("Frontend repository owner"),
    repo: z.string().describe("Frontend repository name"),
    branch: z.string().describe("Branch name"),
  }),
  backendChanges: backendChangesSchema,
});

// Output schema - export item schema for reuse
export const frontendImpactItemSchema = z.object({
  repo: z.string().describe("Frontend repository name"),
  file: z.string().describe("File path in frontend repo"),
  line: z.number().describe("Line number where the reference occurs"),
  reference: z
    .string()
    .describe("The API term being referenced (e.g., 'User.email')"),
  severity: z
    .enum(["high", "medium", "low"])
    .describe(
      "Severity of the impact (high = breaking, medium = may break, low = minor)"
    ),
  suggestedFix: z.string().describe("Suggested fix for the frontend code"),
});

export const frontendImpactsSchema = z.object({
  frontendImpacts: z.array(frontendImpactItemSchema),
});

type FrontendFinderInput = z.infer<typeof frontendFinderInputSchema>;
type FrontendImpactsOutput = z.infer<typeof frontendImpactsSchema>;

/**
 * Agent 2: Frontend Impact Finder
 * Determines where backend API changes impact frontend code using GitHub MCP tools
 */
export async function findFrontendImpacts(
  input: FrontendFinderInput,
  tools: Record<string, any>,
  openaiApiKey: string
): Promise<FrontendImpactsOutput> {
  // Validate inputs
  if (!input) {
    throw new Error("Input is required");
  }

  if (!input.frontendRepo) {
    throw new Error("Input.frontendRepo is required");
  }

  if (
    !input.frontendRepo.owner ||
    typeof input.frontendRepo.owner !== "string"
  ) {
    throw new Error(
      "Input.frontendRepo.owner is required and must be a string"
    );
  }

  if (!input.frontendRepo.repo || typeof input.frontendRepo.repo !== "string") {
    throw new Error("Input.frontendRepo.repo is required and must be a string");
  }

  if (
    !input.frontendRepo.branch ||
    typeof input.frontendRepo.branch !== "string"
  ) {
    throw new Error(
      "Input.frontendRepo.branch is required and must be a string"
    );
  }

  if (!Array.isArray(input.backendChanges)) {
    throw new Error("Input.backendChanges is required and must be an array");
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
      "OpenAI API key is required and must be a non-empty string"
    );
  }

  const { frontendRepo, backendChanges } = input;

  const prompt = `Find frontend code in ${frontendRepo.owner}/${
    frontendRepo.repo
  } (branch: ${
    frontendRepo.branch
  }) that is impacted by these backend API changes:

Backend Changes (complete structured data):
${JSON.stringify(backendChanges, null, 2)}

Each backend change includes structured information - use the appropriate fields based on impact type:
- Field renames: oldFieldName and newFieldName (search for oldFieldName)
- Field removals/additions: fieldName
- Endpoint changes: oldEndpointPath and/or newEndpointPath
- Parameter changes: parameterName
- Type changes: fieldName, oldType, newType
- Status code changes: oldStatusCode, newStatusCode
- Enum value additions/removals: enumName, enumValue (CRITICAL for strictly compiled languages)
- Nullable/required changes: fieldName, wasNullable, isNowNullable
- Array/object structure changes: fieldName, oldArrayStructure, newArrayStructure, oldObjectStructure, newObjectStructure
- Default value changes: fieldName, oldDefaultValue, newDefaultValue
- Union type extensions: fieldName, newUnionType

Process:
1. For each backend change, extract the API terms to search for:
   - Use the structured fields provided based on the impact type
   - For field renames: search for oldFieldName (what needs to be updated)
   - For field removals: search for fieldName
   - For endpoint changes: search for oldEndpointPath
   - For enum value additions (enumValueAdded): search for enumName - this is CRITICAL for strictly compiled languages (Swift enums, Kotlin sealed classes, TypeScript strict enums, Rust enums, Go constants) as they will fail during deserialization if the new value isn't handled. JavaScript clients are unaffected.
   - For enum value removals (enumValueRemoved): search for enumName and enumValue
   - For nullableToRequired: search for fieldName (clients expecting optional fields will fail deserialization when field becomes required)
   - For array/object structure changes: search for fieldName
   - Use these terms to search in the client code
2. Search the client repository efficiently:
   - Explore repository structure to identify directories likely containing API calls (e.g., api/, services/, utils/, hooks/, components that make API calls)
   - For strictly typed languages (TypeScript strict, Swift, Kotlin, Rust, Go), check for enum/sealed class/union definitions, model files, and serialization/deserialization code
   - For each API term from backend changes, search for references in relevant files
   - Read only the necessary files or file sections where references are found
   - Do not read entire repository - focus on files that likely contain API usage
3. For each match found, determine:
   - File path and line number where the reference occurs
   - The specific API term/reference found
   - Severity: high (breaking change causing deserialization failures/crashes in strictly typed clients), medium (may break), low (minor issue)
   - A clear suggested fix

CRITICAL: Focus on deserialization-breaking changes for strictly compiled languages:
- For enumValueAdded: Check if the enum is strictly typed (Swift enum, Kotlin sealed class, TypeScript strict enum, Rust enum, Go constants) - these will fail deserialization if new values aren't handled. JavaScript clients ignore unknown enum values.
- For nullableToRequired: Check if the field is marked as optional/nullable in the client type definition - making it required breaks deserialization when the field is missing
- For arrayStructureChanged: Check array/collection type definitions - structure changes break deserialization due to type mismatches
- For enumValueRemoved: Check if the removed enum value is referenced in switch/case, when expressions, or pattern matching - will cause compile-time or runtime errors
- For objectStructureChanged: Check object/struct type definitions - structure changes break property mapping during deserialization
- For typeChanged: Check type definitions - type changes break deserialization when types don't match
- For requiredToNullable: Can break clients expecting non-null values (null pointer exceptions, type errors)

The key insight: JavaScript and other loosely typed languages are flexible and won't break from many of these changes. However, strictly compiled languages (Swift, Kotlin, Rust, Go, etc.) will fail during deserialization when the API schema doesn't match the client's type definitions exactly.

IMPORTANT:
- Search efficiently - don't read entire repository
- Focus on files that are likely to contain API calls/references
- Only read file contents when references are found or likely to exist
- Match API terms accurately (case-sensitive where relevant)

Return all impacts found in this frontend repository. If no impacts are found, return an empty frontendImpacts array.`;

  const openaiClient = createOpenAI({ apiKey: openaiApiKey });

  const outputSpec = Output.object({
    schema: frontendImpactsSchema,
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

  return result.output as FrontendImpactsOutput;
}
