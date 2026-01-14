import { z } from "zod/v3";
import pino from "pino";

export function logZodError(error: z.ZodError, logger: pino.Logger): void {
  logger.error({ issues: error.issues }, "Validation failed");
}
