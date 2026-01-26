/**
 * Test/Development Script for Local Development
 *
 * This script is a thin wrapper around orchestrate.ts that reads configuration
 * from environment variables for local testing and development.
 *
 * It calls runFarkAnalysis from orchestrate.ts, which contains the full
 * production workflow logic.
 */
import "dotenv/config";
import { runFarkAnalysis } from "./workflow/orchestrate";
import { frontendRepoSchema } from "./schemas/frontend-finder-schema";
import pino from "pino";
import { z } from "zod/v3";
import { logZodError } from "./utils/log-zod-error";

// Schema for frontend config from env (without openaiApiKey)
const frontendConfigFromEnvSchema = z.object({
  repository: frontendRepoSchema,
  codebasePath: z.string().min(1),
});

const envSchema = z.object({
  BACKEND_GITHUB_TOKEN: z.string().min(1),
  MCP_SERVER_URL: z.string().url(),
  BACKEND_OWNER: z.string().min(1),
  BACKEND_REPO: z.string().min(1),
  BACKEND_CODEBASE_PATH: z.string().min(1),
  BACKEND_PR_NUMBER: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
  OPENAI_API_KEY: z.string().min(1), // Used for both backend analyzer and frontend finders
  FRONTENDS: z.string().transform((val) => {
    try {
      const parsed = JSON.parse(val);
      return z.array(frontendConfigFromEnvSchema).parse(parsed);
    } catch (error) {
      throw new Error(
        `Failed to parse FRONTENDS JSON: ${error instanceof Error ? error.message : String(error)}. Ensure FRONTENDS is valid single-line JSON.`
      );
    }
  }),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .optional(),
});

async function main() {
  const logger = pino({
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  });

  try {
    const env = envSchema.parse(process.env);

    await runFarkAnalysis({
      backend: {
        repository: {
          owner: env.BACKEND_OWNER,
          repo: env.BACKEND_REPO,
          pull_number: env.BACKEND_PR_NUMBER,
        },
        codebasePath: env.BACKEND_CODEBASE_PATH,
        githubMcp: {
          beGithubToken: env.BACKEND_GITHUB_TOKEN,
          mcpServerUrl: env.MCP_SERVER_URL,
        },
        options: undefined,
      },
      frontends: env.FRONTENDS,
      openaiApiKey: env.OPENAI_API_KEY,
      logLevel: env.LOG_LEVEL || "info",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logZodError(error, logger);
    } else if (error instanceof Error) {
      logger.error(
        { message: error.message, stack: error.stack },
        "Error details"
      );
    } else {
      logger.error({ err: error }, "❌ Analysis failed");
    }
  }
}

main();
