"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReadonlyFilesystemTools = getReadonlyFilesystemTools;
const ai_1 = require("ai");
const node_path_1 = __importDefault(require("node:path"));
const v3_1 = require("zod/v3");
/**
 * Creates readonly filesystem tools for a specific codebase using just-bash
 * Uses overlay filesystem to mount the existing codebase as read-only.
 * No file contents are loaded into memory.
 * @param codebasePath Absolute path to the codebase directory
 * @returns Object containing readonly AI SDK tools (readFile, bash)
 */
async function getReadonlyFilesystemTools(codebasePath) {
    if (!codebasePath) {
        throw new Error("Codebase path is required");
    }
    /**
     * Create a just-bash sandbox mounting the existing codebase as read-only
     * via an overlay filesystem. No file contents are loaded into memory.
     */
    const { Bash, OverlayFs } = await (new Function("m", "return import(m)"))("just-bash");
    const absoluteRoot = node_path_1.default.resolve(codebasePath);
    // Create an overlay FS that points to the real checkout as the lower layer.
    // just-bash will use this overlay for all filesystem operations.
    const fs = new OverlayFs({
        root: absoluteRoot, // read-only lower layer
    });
    const bash = new Bash({ fs, cwd: fs.getMountPoint() });
    const readFileTool = (0, ai_1.tool)({
        description: "Read the contents of a file from the codebase.",
        inputSchema: v3_1.z.object({
            path: v3_1.z
                .string()
                .describe("The path to the file to read (relative to codebase root)"),
        }),
        execute: async ({ path: filePath }) => {
            try {
                const resolvedPath = node_path_1.default.posix.resolve("/", filePath);
                const content = await fs.readFile(resolvedPath, "utf-8");
                return { content };
            }
            catch (error) {
                throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
            }
        },
    });
    const bashTool = (0, ai_1.tool)({
        description: "Execute bash commands in the codebase sandbox. Commands are run as given.",
        inputSchema: v3_1.z.object({
            command: v3_1.z.string().describe("The bash command to execute"),
        }),
        execute: async ({ command }) => {
            try {
                const result = await bash.exec(command);
                if (result.exitCode !== 0) {
                    // Non-zero exit codes are surfaced as errors
                    throw new Error(`bash failed (code ${result.exitCode}): ${result.stderr || result.stdout}`);
                }
                return {
                    stdout: result.stdout,
                    stderr: result.stderr,
                    exitCode: result.exitCode,
                };
            }
            catch (error) {
                throw new Error(`Bash command failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        },
    });
    return {
        readFile: readFileTool,
        bash: bashTool,
    };
}
//# sourceMappingURL=filesystem-tools.js.map