import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod/v3";
import { backendChangesSchema } from "./be-analyzer";
import { frontendImpactsSchema } from "./frontend-finder";

// Input schema
const commentGeneratorInputSchema = z.object({
  backendChanges: backendChangesSchema,
  frontendImpacts: frontendImpactsSchema,
  backend_owner: z.string().describe("Backend repository owner"),
  backend_repo: z.string().describe("Backend repository name"),
  pull_number: z.number().describe("Pull request number"),
});

// Output schema
const prCommentsSchema = z.object({
  comments: z.array(
    z.object({
      file: z.string().describe("File path in the backend PR"),
      line: z
        .number()
        .describe("Line number in the diff (from backendChanges.diffHunks)"),
      body: z
        .string()
        .describe(
          "Comment text explaining the breaking change, impacted frontend files, and suggested fix",
        ),
    }),
  ),
  summary: z.string().describe("Summary of breaking changes detected"),
});

type CommentGeneratorInput = z.infer<typeof commentGeneratorInputSchema>;
type PRCommentsOutput = z.infer<typeof prCommentsSchema>;

/**
 * Agent 3: PR Comment Generator
 * Generates inline PR comments for backend changes with frontend impact information
 */
export async function generatePRComments(
  input: CommentGeneratorInput,
  openaiApiKey: string,
): Promise<PRCommentsOutput> {
  // Validate inputs
  if (!input) {
    throw new Error("Input is required");
  }

  if (!Array.isArray(input.backendChanges)) {
    throw new Error("Input.backendChanges is required and must be an array");
  }

  if (!Array.isArray(input.frontendImpacts)) {
    throw new Error("Input.frontendImpacts is required and must be an array");
  }

  if (!input.backend_owner || typeof input.backend_owner !== "string") {
    throw new Error("Input.backend_owner is required and must be a string");
  }

  if (!input.backend_repo || typeof input.backend_repo !== "string") {
    throw new Error("Input.backend_repo is required and must be a string");
  }

  if (typeof input.pull_number !== "number" || input.pull_number <= 0) {
    throw new Error(
      "Input.pull_number is required and must be a positive number",
    );
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

  const {
    backendChanges,
    frontendImpacts,
    backend_owner,
    backend_repo,
    pull_number,
  } = input;

  const prompt = `Generate inline PR comments for pull request #${pull_number} in ${backend_owner}/${backend_repo}.

Backend Changes:
${JSON.stringify(backendChanges, null, 2)}

Frontend Impacts:
${JSON.stringify(frontendImpacts, null, 2)}

Process:
1. Match frontend impacts to their corresponding backend changes
2. For each backend change with frontend impacts, create a comment at the appropriate diff line:
   - Use startLine or endLine from backendChanges.diffHunks to determine the comment position
   - Include the file path from backendChanges
3. Each comment should:
   - Clearly explain what changed in the backend API
   - List which frontend files/repos are impacted (from frontendImpacts)
   - Include severity information
   - Provide actionable suggested fixes
   - Be concise and clear

If no frontend impacts were found, generate a summary comment indicating that no impacts were detected.

Generate comments with correct file paths and line numbers from backendChanges.diffHunks.`;

  const openaiClient = createOpenAI({ apiKey: openaiApiKey });

  const outputSpec = Output.object({
    schema: prCommentsSchema,
  });

  const result = await generateText({
    model: openaiClient("gpt-4o"),
    output: outputSpec,
    prompt,
  });

  if (!result.output) {
    throw new Error("Failed to generate structured output from the model");
  }

  return result.output as PRCommentsOutput;
}
