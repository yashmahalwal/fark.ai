import { z } from "zod/v3";

export const agentOptionsSchema = z.object({
  maxSteps: z.number().int().positive().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  maxTotalTokens: z.number().int().positive().optional(),
});

export type AgentOptions = z.infer<typeof agentOptionsSchema>;
