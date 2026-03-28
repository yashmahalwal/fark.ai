import { z } from "zod/v3";
export declare const commentGeneratorInputSchema: z.ZodObject<{
    changes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        file: z.ZodString;
        diffHunks: z.ZodArray<z.ZodObject<{
            startLine: z.ZodNumber;
            endLine: z.ZodNumber;
            startSide: z.ZodEnum<["LEFT", "RIGHT"]>;
            endSide: z.ZodEnum<["LEFT", "RIGHT"]>;
            changes: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            startLine: number;
            endLine: number;
            startSide: "LEFT" | "RIGHT";
            endSide: "LEFT" | "RIGHT";
            changes: string[];
        }, {
            startLine: number;
            endLine: number;
            startSide: "LEFT" | "RIGHT";
            endSide: "LEFT" | "RIGHT";
            changes: string[];
        }>, "many">;
        impact: z.ZodEnum<["fieldRenamed", "fieldRemoved", "fieldAdded", "endpointChanged", "parameterAdded", "parameterRemoved", "typeChanged", "statusCodeChanged", "enumValueAdded", "enumValueRemoved", "nullableToRequired", "requiredToNullable", "arrayStructureChanged", "objectStructureChanged", "defaultValueChanged", "unionTypeExtended", "other"]>;
        description: z.ZodString;
    } & {
        frontendImpacts: z.ZodArray<z.ZodObject<{
            backendBatchId: z.ZodString;
            backendChangeId: z.ZodString;
            frontendRepo: z.ZodString;
            file: z.ZodString;
            apiElement: z.ZodString;
            description: z.ZodString;
            severity: z.ZodEnum<["high", "medium", "low"]>;
        }, "strip", z.ZodTypeAny, {
            file: string;
            description: string;
            backendBatchId: string;
            backendChangeId: string;
            frontendRepo: string;
            apiElement: string;
            severity: "high" | "medium" | "low";
        }, {
            file: string;
            description: string;
            backendBatchId: string;
            backendChangeId: string;
            frontendRepo: string;
            apiElement: string;
            severity: "high" | "medium" | "low";
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        id: string;
        file: string;
        diffHunks: {
            startLine: number;
            endLine: number;
            startSide: "LEFT" | "RIGHT";
            endSide: "LEFT" | "RIGHT";
            changes: string[];
        }[];
        impact: "fieldRenamed" | "fieldRemoved" | "fieldAdded" | "endpointChanged" | "parameterAdded" | "parameterRemoved" | "typeChanged" | "statusCodeChanged" | "enumValueAdded" | "enumValueRemoved" | "nullableToRequired" | "requiredToNullable" | "arrayStructureChanged" | "objectStructureChanged" | "defaultValueChanged" | "unionTypeExtended" | "other";
        description: string;
        frontendImpacts: {
            file: string;
            description: string;
            backendBatchId: string;
            backendChangeId: string;
            frontendRepo: string;
            apiElement: string;
            severity: "high" | "medium" | "low";
        }[];
    }, {
        id: string;
        file: string;
        diffHunks: {
            startLine: number;
            endLine: number;
            startSide: "LEFT" | "RIGHT";
            endSide: "LEFT" | "RIGHT";
            changes: string[];
        }[];
        impact: "fieldRenamed" | "fieldRemoved" | "fieldAdded" | "endpointChanged" | "parameterAdded" | "parameterRemoved" | "typeChanged" | "statusCodeChanged" | "enumValueAdded" | "enumValueRemoved" | "nullableToRequired" | "requiredToNullable" | "arrayStructureChanged" | "objectStructureChanged" | "defaultValueChanged" | "unionTypeExtended" | "other";
        description: string;
        frontendImpacts: {
            file: string;
            description: string;
            backendBatchId: string;
            backendChangeId: string;
            frontendRepo: string;
            apiElement: string;
            severity: "high" | "medium" | "low";
        }[];
    }>, "many">;
    backend_owner: z.ZodString;
    backend_repo: z.ZodString;
    pull_number: z.ZodNumber;
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
    changes: {
        id: string;
        file: string;
        diffHunks: {
            startLine: number;
            endLine: number;
            startSide: "LEFT" | "RIGHT";
            endSide: "LEFT" | "RIGHT";
            changes: string[];
        }[];
        impact: "fieldRenamed" | "fieldRemoved" | "fieldAdded" | "endpointChanged" | "parameterAdded" | "parameterRemoved" | "typeChanged" | "statusCodeChanged" | "enumValueAdded" | "enumValueRemoved" | "nullableToRequired" | "requiredToNullable" | "arrayStructureChanged" | "objectStructureChanged" | "defaultValueChanged" | "unionTypeExtended" | "other";
        description: string;
        frontendImpacts: {
            file: string;
            description: string;
            backendBatchId: string;
            backendChangeId: string;
            frontendRepo: string;
            apiElement: string;
            severity: "high" | "medium" | "low";
        }[];
    }[];
    backend_owner: string;
    backend_repo: string;
    options?: {
        maxSteps?: number | undefined;
        maxOutputTokens?: number | undefined;
        maxTotalTokens?: number | undefined;
    } | undefined;
}, {
    pull_number: number;
    changes: {
        id: string;
        file: string;
        diffHunks: {
            startLine: number;
            endLine: number;
            startSide: "LEFT" | "RIGHT";
            endSide: "LEFT" | "RIGHT";
            changes: string[];
        }[];
        impact: "fieldRenamed" | "fieldRemoved" | "fieldAdded" | "endpointChanged" | "parameterAdded" | "parameterRemoved" | "typeChanged" | "statusCodeChanged" | "enumValueAdded" | "enumValueRemoved" | "nullableToRequired" | "requiredToNullable" | "arrayStructureChanged" | "objectStructureChanged" | "defaultValueChanged" | "unionTypeExtended" | "other";
        description: string;
        frontendImpacts: {
            file: string;
            description: string;
            backendBatchId: string;
            backendChangeId: string;
            frontendRepo: string;
            apiElement: string;
            severity: "high" | "medium" | "low";
        }[];
    }[];
    backend_owner: string;
    backend_repo: string;
    options?: {
        maxSteps?: number | undefined;
        maxOutputTokens?: number | undefined;
        maxTotalTokens?: number | undefined;
    } | undefined;
}>;
export declare const prCommentsSchema: z.ZodObject<{
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
export type CommentGeneratorInput = z.infer<typeof commentGeneratorInputSchema>;
export type PRCommentsOutput = z.infer<typeof prCommentsSchema>;
//# sourceMappingURL=comment-generator-schema.d.ts.map