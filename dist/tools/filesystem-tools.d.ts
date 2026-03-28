/**
 * Creates readonly filesystem tools for a specific codebase using just-bash
 * Uses overlay filesystem to mount the existing codebase as read-only.
 * No file contents are loaded into memory.
 * @param codebasePath Absolute path to the codebase directory
 * @returns Object containing readonly AI SDK tools (readFile, bash)
 */
export declare function getReadonlyFilesystemTools(codebasePath: string): Promise<{
    readFile: import("ai").Tool<{
        path: string;
    }, {
        content: string;
    }>;
    bash: import("ai").Tool<{
        command: string;
    }, {
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
}>;
//# sourceMappingURL=filesystem-tools.d.ts.map