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

const envSchema = z.object({
  BACKEND_GITHUB_TOKEN: z.string().min(1),
  FRONTEND_GITHUB_TOKEN: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  MCP_SERVER_URL: z.string().url(),
  BACKEND_OWNER: z.string().min(1),
  BACKEND_REPO: z.string().min(1),
  BACKEND_PR_NUMBER: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
  FRONTEND_REPOS: z.string().transform((val) => {
    const parsed = JSON.parse(val);
    return z.array(frontendRepoSchema).parse(parsed);
  }),
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

    const result = await runFarkAnalysis({
      backend: {
        owner: env.BACKEND_OWNER,
        repo: env.BACKEND_REPO,
        pull_number: env.BACKEND_PR_NUMBER,
      },
      frontendRepos: env.FRONTEND_REPOS,
      beGithubToken: env.BACKEND_GITHUB_TOKEN,
      frontendGithubToken: env.FRONTEND_GITHUB_TOKEN,
      mcpServerUrl: env.MCP_SERVER_URL,
      openaiApiKey: env.OPENAI_API_KEY,
      logLevel: "debug",
      beAnalyzerOptions: undefined,
      frontendFinderOptions: undefined,
    });
    logger.info(
      {
        changes: result.changes.length,
        totalImpacts: result.changes.reduce(
          (sum, c) => sum + c.frontendImpacts.length,
          0
        ),
        prComments: result.prComments.comments.length,
      },
      "✅ Analysis completed successfully!"
    );
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
