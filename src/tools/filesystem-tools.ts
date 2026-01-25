import { createBashTool } from "bash-tool";

/**
 * Creates readonly filesystem tools for a specific codebase using bash-tool
 * Uses uploadDirectory to point to the local codebase path
 * @param codebasePath Absolute path to the codebase directory
 * @returns Object containing readonly AI SDK tools (readFile, bash)
 */
export async function getReadonlyFilesystemTools(codebasePath: string) {
  if (!codebasePath) {
    throw new Error("Codebase path is required");
  }

  const { tools } = await createBashTool({
    uploadDirectory: {
      source: codebasePath,
      // No include pattern -> includes all files
    },
  });

  // Return only readonly tools: bash and readFile
  return {
    readFile: tools.readFile,
    bash: tools.bash,
  };
}
