import { Bash, OverlayFs } from "just-bash";
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
  const absoluteRoot = path.resolve(codebasePath);

  // Create an overlay FS that points to the real checkout as the lower layer.
  // just-bash will use this overlay for all filesystem operations.
  const fs = new OverlayFs({
    root: absoluteRoot, // read-only lower layer
  });

  // Create a Bash instance using this filesystem
  const bash = new Bash({
    fs,
    cwd: "/",
  });

  const cwd = "/";

  /**
   * readFile tool: reads file on demand as text
   */
  const readFileTool = tool({
    description: "Read the contents of a file from the codebase.",
    inputSchema: z.object({
      path: z.string().describe("The path to the file to read (relative to codebase root)"),
    }),
    execute: async ({ path: filePath }) => {
      try {
        const resolvedPath = path.posix.resolve(cwd, filePath);
        const content = await fs.readFile(resolvedPath, "utf-8");
        return { content };
      } catch (error) {
        throw new Error(
          `Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
  });

  /**
   * bash tool: executes a shell command inside this just-bash environment
   */
  const bashTool = tool({
    description: `Execute bash commands in the sandbox environment.

WORKING DIRECTORY: ${cwd}
All commands execute from this directory. Use relative paths from here.

Common operations:
  ls -la              # List files with details
  find . -name '*.ts' # Find files by pattern
  grep -r 'pattern' . # Search file contents
  cat <file>          # View file contents`,
    inputSchema: z.object({
      command: z.string().describe("The bash command to execute"),
    }),
    execute: async ({ command }) => {
      try {
        // Prepend cd to ensure commands run in the working directory
        const fullCommand = `cd "${cwd}" && ${command}`;
        const result = await bash.exec(fullCommand);
        
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
