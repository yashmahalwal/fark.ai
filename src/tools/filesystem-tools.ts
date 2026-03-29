import { tool } from "ai";
import path from "node:path";
import { z } from "zod/v3";

/**
 * Creates readonly filesystem tools for a specific codebase using just-bash
 * Uses overlay filesystem to mount the existing codebase as read-only.
 * No file contents are loaded into memory.
 * @param codebasePath Absolute path to the codebase directory
 * @returns Object containing readonly AI SDK tools (readFile, bash)
 */
export async function getReadonlyFilesystemTools(codebasePath: string) {
  if (!codebasePath) {
    throw new Error("Codebase path is required");
  }

  /**
   * Create a just-bash sandbox mounting the existing codebase as read-only
   * via an overlay filesystem. No file contents are loaded into memory.
   */
  const { Bash, OverlayFs } = await (new Function("m", "return import(m)"))("just-bash") as typeof import("just-bash");
  const absoluteRoot = path.resolve(codebasePath);

  // Create an overlay FS that points to the real checkout as the lower layer.
  // just-bash will use this overlay for all filesystem operations.
  const fs = new OverlayFs({
    root: absoluteRoot, // read-only lower layer
  });

  const bash = new Bash({ fs, cwd: fs.getMountPoint() });

  const readFileTool = tool({
    description: "Read the contents of a file from the codebase.",
    inputSchema: z.object({
      path: z
        .string()
        .describe("The path to the file to read (relative to codebase root)"),
    }),
    execute: async ({ path: filePath }) => {
      try {
        const resolvedPath = path.posix.resolve("/", filePath);
        const content = await fs.readFile(resolvedPath, "utf-8");
        return { content };
      } catch (error) {
        throw new Error(
          `Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
  });

  const bashTool = tool({
    description:
      "Execute bash commands in the codebase sandbox. Commands are run as given.",
    inputSchema: z.object({
      command: z.string().describe("The bash command to execute"),
    }),
    execute: async ({ command }) => {
      try {
        const result = await bash.exec(command);

        if (result.exitCode !== 0) {
          // Non-zero exit codes are surfaced as errors
          throw new Error(
            `bash failed (code ${result.exitCode}): ${result.stderr || result.stdout}`
          );
        }

        return {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
        };
      } catch (error) {
        throw new Error(
          `Bash command failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
  });

  return {
    readFile: readFileTool,
    bash: bashTool,
  };
}
