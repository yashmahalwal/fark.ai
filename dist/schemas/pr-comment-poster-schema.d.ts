import { z } from "zod/v3";
export declare const prCommentPosterInputSchema: z.ZodObject<{
    comments: z.ZodObject<{
        summary: z.ZodString;
        comments: z.ZodArray<z.ZodObject<{
            path: z.ZodString;
            startLine: z.ZodNumber;
            endLine: z.ZodNumber;
            startSide: z.ZodEnum<["LEFT", "RIGHT"]>;
            endSide: z.ZodEnum<["LEFT", "RIGHT"]>;
            body: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            path: string;
            startLine: number;
            endLine: number;
            startSide: "LEFT" | "RIGHT";
            endSide: "LEFT" | "RIGHT";
            body: string;
        }, {
            path: string;
            startLine: number;
            endLine: number;
            startSide: "LEFT" | "RIGHT";
            endSide: "LEFT" | "RIGHT";
            body: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        summary: string;
        comments: {
            path: string;
            startLine: number;
            endLine: number;
            startSide: "LEFT" | "RIGHT";
            endSide: "LEFT" | "RIGHT";
            body: string;
        }[];
    }, {
        summary: string;
        comments: {
            path: string;
            startLine: number;
            endLine: number;
            startSide: "LEFT" | "RIGHT";
            endSide: "LEFT" | "RIGHT";
            body: string;
        }[];
    }>;
    backend_owner: z.ZodString;
    backend_repo: z.ZodString;
    pull_number: z.ZodNumber;
    githubMcp: z.ZodObject<{
        token: z.ZodString;
        mcpServerUrl: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        token: string;
        mcpServerUrl: string;
    }, {
        token: string;
        mcpServerUrl: string;
    }>;
    options: z.ZodOptional<z.ZodObject<{
        maxSteps: z.ZodOptional<z.ZodNumber>;
        maxOutputTokens: z.ZodOptional<z.ZodNumber>;
        maxTotalTokens: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxSteps?: number | undefined;
        maxOutputTokens?: number | undefined;
        maxTotalTokens?: number | undefined;
    }, {
        maxSteps?: number | undefined;
        maxOutputTokens?: number | undefined;
        maxTotalTokens?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    pull_number: number;
    githubMcp: {
        token: string;
        mcpServerUrl: string;
    };
    backend_owner: string;
    backend_repo: string;
    comments: {
        summary: string;
        comments: {
            path: string;
            startLine: number;
            endLine: number;
            startSide: "LEFT" | "RIGHT";
            endSide: "LEFT" | "RIGHT";
            body: string;
        }[];
    };
    options?: {
        maxSteps?: number | undefined;
        maxOutputTokens?: number | undefined;
        maxTotalTokens?: number | undefined;
    } | undefined;
}, {
    pull_number: number;
    githubMcp: {
        token: string;
        mcpServerUrl: string;
    };
    backend_owner: string;
    backend_repo: string;
    comments: {
        summary: string;
        comments: {
            path: string;
            startLine: number;
            endLine: number;
            startSide: "LEFT" | "RIGHT";
            endSide: "LEFT" | "RIGHT";
            body: string;
        }[];
    };
    options?: {
        maxSteps?: number | undefined;
        maxOutputTokens?: number | undefined;
        maxTotalTokens?: number | undefined;
    } | undefined;
}>;
export declare const prCommentPosterOutputSchema: z.ZodObject<{
    reviewId: z.ZodNumber;
    success: z.ZodBoolean;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    reviewId: number;
    success: boolean;
}, {
    message: string;
    reviewId: number;
    success: boolean;
}>;
export type PRCommentPosterInput = z.infer<typeof prCommentPosterInputSchema>;
export type PRCommentPosterOutput = z.infer<typeof prCommentPosterOutputSchema>;
//# sourceMappingURL=pr-comment-poster-schema.d.ts.map