import { generateText, stepCountIs, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod/v3";
import pino from "pino";

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
// Note: OpenAI Responses API requires all properties to be in 'required' array
// So we use nullable() instead of optional() for optional fields
export const backendChangeItemSchema = z.object({
  file: z.string().describe("File path where the change occurred"),
  diffHunks: z.array(
    z.object({
      startLine: z.number().describe("Starting line number in the diff"),
      endLine: z.number().describe("Ending line number in the diff"),
      changes: z.array(z.string()).describe("Array of diff lines"),
    })
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
});

// Output schema
export const backendChangesSchema = z.object({
  backendChanges: z.array(backendChangeItemSchema),
});

export type BackendInput = z.infer<typeof backendInputSchema>;
export type BackendChangesOutput = z.infer<typeof backendChangesSchema>;

/**
 * Agent 1: BE Diff Analyzer
 * Extracts API interface changes from PR diff using GitHub MCP tools and OpenAI reasoning
 */
export async function analyzeBackendDiff(
  input: BackendInput,
  tools: Record<string, any>,
  openaiApiKey: string,
  logger: pino.Logger = pino(),
  options?: {
    maxSteps?: number;
    maxOutputTokens?: number;
    maxTotalTokens?: number;
  }
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
      "Input.backend.pull_number is required and must be a positive number"
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
      "OpenAI API key is required and must be a non-empty string"
    );
  }

  const { backend } = input;
  logger.info(
    {
      pull_number: backend.pull_number,
      owner: backend.owner,
      repo: backend.repo,
    },
    `BE Analyzer: Analyzing PR #${backend.pull_number} in ${backend.owner}/${backend.repo}`
  );

  const prompt = `Analyze pull request #${backend.pull_number} in ${backend.owner}/${backend.repo} to identify ALL breaking API interface changes that affect client code.

CRITICAL CONSTRAINTS:
1. Focus on API INTERFACE changes (REST routes, GraphQL schema, gRPC proto) - NOT internal files
2. Internal changes (models, types, business logic) should be READ to understand API impact, but NOT reported as separate breaking changes
3. BE diffs and files can be MASSIVE. You MUST:
   - Read files in CHUNKS when possible - only read necessary portions
   - Do NOT read complete diffs if they are large - focus on changed sections
   - Do NOT read complete files unless absolutely necessary - read only relevant sections
   - Explore file structure first before reading content
   - If a file is too large, read specific line ranges or sections

PROCESS:
1. Identify relevant files from the PR:
   - Get the list of ALL changed files from the PR
   - Identify which files are directly or indirectly related to API interface changes:
     * Direct API interface files: routes, controllers, API schemas, GraphQL schema, gRPC proto files
     * Indirect files: models, types, business logic, validation, serialization that affect API behavior
   - ONLY read diffs for files that are relevant to API interface changes
   - Skip reading diffs for files that are clearly unrelated (e.g., tests, documentation, build configs, unless they affect API)
   - For each relevant file, read the diff (or relevant chunks if the diff is large) to understand what changed

2. Read BE repository code files when needed:
   - Read actual repository code files when you need full context beyond the diff
   - Read both the changed files AND related files that use those types/models to understand the full impact
   - Search code to find where types, models, or functions are used across the codebase
   - Read API interface files (routes, controllers, schemas) to see how internal changes propagate to the API
   - Read internal files (models, types, business logic) to understand what changed and how it affects API behavior
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
- If an API interface file has multiple breaking changes, create a separate entry for each one
- If the same API change appears in multiple API systems (REST, GraphQL, gRPC), create separate entries for each
- Use internal changes to explain the API change in the description (e.g., "Internal model User.email renamed, causing REST endpoint /users to return 'emailAddress' instead of 'email'")
- Explain HOW the change breaks the API from the client's perspective
- Populate structured fields (oldFieldName, newFieldName, fieldName, endpointPath, enumName, enumValue, etc.) when available from the diff
- Do NOT report internal model/type changes as separate breaking changes - only report their impact on API interfaces
- Do NOT stop after finding one change - continue until you've analyzed all API interface changes

If no API-relevant breaking changes are detected after thoroughly analyzing all changed files, return an empty backendChanges array.`;

  const openaiClient = createOpenAI({ apiKey: openaiApiKey });

  const outputSpec = Output.object({
    schema: backendChangesSchema,
  });

  // Get limits from options with fallback defaults
  const MAX_STEPS = options?.maxSteps || 20;
  const FORCE_OUTPUT_AT_STEP = Math.max(1, MAX_STEPS - 2); // Force output generation 2 steps before limit
  const MAX_OUTPUT_TOKENS = options?.maxOutputTokens || 50000;
  const MAX_TOTAL_TOKENS = options?.maxTotalTokens || 200000;

  // Track total token usage across all steps
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  logger.info(
    {
      maxSteps: MAX_STEPS,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      maxTotalTokens: MAX_TOTAL_TOKENS,
      toolsCount: Object.keys(tools).length,
    },
    "BE Analyzer: Starting analysis with OpenAI"
  );

  const generateTextOptions: Parameters<typeof generateText>[0] = {
    model: openaiClient("gpt-5"),
    output: outputSpec,
    tools,
    activeTools: ["get_file_contents", "search_code", "pull_request_read"], // Limit to read-only tools using AI SDK's activeTools
    stopWhen: stepCountIs(MAX_STEPS), // Stop when model generates text or after max steps
    maxOutputTokens: MAX_OUTPUT_TOKENS, // Limit output tokens
    prompt,
    prepareStep: async ({ stepNumber, steps, messages }) => {
      // Track token usage across steps
      const stepUsage = steps.reduce(
        (acc, step) => {
          if (step.usage) {
            return {
              inputTokens: acc.inputTokens + (step.usage.inputTokens || 0),
              outputTokens: acc.outputTokens + (step.usage.outputTokens || 0),
            };
          }
          return acc;
        },
        { inputTokens: 0, outputTokens: 0 }
      );
      totalInputTokens = stepUsage.inputTokens;
      totalOutputTokens = stepUsage.outputTokens;
      const currentTotalTokens = totalInputTokens + totalOutputTokens;

      // Warn if approaching token limits
      if (currentTotalTokens > MAX_TOTAL_TOKENS * 0.8) {
        logger.warn(
          {
            stepNumber,
            currentTotalTokens,
            maxTotalTokens: MAX_TOTAL_TOKENS,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            percentage: Math.round(
              (currentTotalTokens / MAX_TOTAL_TOKENS) * 100
            ),
          },
          "BE Analyzer: Approaching total token limit"
        );
      }

      // Abort if token limit exceeded
      if (currentTotalTokens >= MAX_TOTAL_TOKENS) {
        logger.error(
          {
            stepNumber,
            currentTotalTokens,
            maxTotalTokens: MAX_TOTAL_TOKENS,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
          },
          "BE Analyzer: Total token limit exceeded, aborting"
        );
        throw new Error(
          `Token limit exceeded: ${currentTotalTokens} tokens used (limit: ${MAX_TOTAL_TOKENS})`
        );
      }

      // When approaching step limit, force the model to generate output instead of calling tools
      if (stepNumber >= FORCE_OUTPUT_AT_STEP) {
        const toolCallsCount = steps.reduce(
          (count, step) => count + (step.toolCalls?.length || 0),
          0
        );
        logger.warn(
          {
            stepNumber,
            maxSteps: MAX_STEPS,
            totalToolCalls: toolCallsCount,
            stepsCompleted: steps.length,
          },
          "BE Analyzer: Approaching step limit, forcing output generation"
        );

        // Check if we already have output from previous steps
        const hasOutput = steps.some(
          (step) => step.text && step.text.trim().length > 0
        );

        if (!hasOutput) {
          // Force text generation by preventing tool calls
          // Also add a reminder message to generate output
          const reminderMessage = {
            role: "user" as const,
            content:
              "IMPORTANT: You are approaching the step limit. You MUST now generate your final output as JSON matching the schema. Do not call any more tools. Return the complete analysis results immediately.",
          };

          return {
            toolChoice: "none", // Prevent tool calls, force text generation
            messages: [...messages, reminderMessage],
          };
        }
      }

      // Default: continue with normal execution
      return {};
    },
    onStepFinish: ({ text, toolCalls, finishReason, usage }) => {
      // Log tool calls with action context (simplified - no full input object)
      if (toolCalls && toolCalls.length > 0) {
        toolCalls.forEach((tc) => {
          // Only log tool name and a brief summary, not the full input object
          logger.debug(
            {
              tool: tc.toolName,
              input: tc.input,
            },
            `BE Analyzer: Tool call - ${tc.toolName}`
          );
        });
      }

      // Log any text output from model
      if (text) {
        logger.debug(
          {
            textLength: text.length,
            finishReason: finishReason || undefined,
          },
          "BE Analyzer: Model generated text output"
        );
      }

      // Log usage if available
      if (usage) {
        const stepTotal = (usage.inputTokens || 0) + (usage.outputTokens || 0);
        logger.debug(
          {
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            stepTotal,
          },
          "BE Analyzer: Token usage"
        );
      }
    },
  };

  const result = await generateText(generateTextOptions);

  // With output spec, result.output will always be present or process exits with error
  if (!result.output) {
    logger.error(
      {
        totalSteps: result.steps?.length || 0,
        finishReason: result.finishReason || undefined,
      },
      "BE Analyzer: Failed to generate structured output from the model"
    );
    throw new Error("Failed to generate structured output from the model");
  }

  const changeCount = result.output.backendChanges.length;
  const impactTypes = result.output.backendChanges.reduce(
    (
      acc: Record<string, number>,
      change: BackendChangesOutput["backendChanges"][number]
    ) => {
      acc[change.impact] = (acc[change.impact] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const filesAffected = new Set(
    result.output.backendChanges.map(
      (change: BackendChangesOutput["backendChanges"][number]) => change.file
    )
  ).size;

  // Calculate final token usage
  const finalUsage = result.steps?.reduce(
    (acc, step) => {
      if (step.usage) {
        acc.inputTokens += step.usage.inputTokens || 0;
        acc.outputTokens += step.usage.outputTokens || 0;
      }
      return acc;
    },
    { inputTokens: 0, outputTokens: 0 }
  ) || { inputTokens: 0, outputTokens: 0 };
  const finalTotalTokens = finalUsage.inputTokens + finalUsage.outputTokens;

  logger.info(
    {
      changeCount,
      filesAffected,
      impactTypes,
      totalSteps: result.steps?.length || 0,
      finishReason: result.finishReason || undefined,
      tokenUsage: {
        inputTokens: finalUsage.inputTokens,
        outputTokens: finalUsage.outputTokens,
        totalTokens: finalTotalTokens,
      },
    },
    `BE Analyzer: Analysis complete - found ${changeCount} breaking change${changeCount !== 1 ? "s" : ""} across ${filesAffected} file${filesAffected !== 1 ? "s" : ""}`
  );

  // Log each breaking change once
  if (changeCount > 0) {
    result.output.backendChanges.forEach(
      (
        change: BackendChangesOutput["backendChanges"][number],
        index: number
      ) => {
        logger.info(
          {
            index: index + 1,
            impact: change.impact,
            file: change.file,
            description: change.description,
          },
          `BE Analyzer: Change ${index + 1} - ${change.impact}`
        );
      }
    );
  }

  return result.output as BackendChangesOutput;
}
