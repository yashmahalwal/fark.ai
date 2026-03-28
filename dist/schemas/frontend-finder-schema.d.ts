import { z } from "zod/v3";
export declare const frontendRepoSchema: z.ZodObject<{
    owner: z.ZodString;
    repo: z.ZodString;
    branch: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    owner: string;
    repo: string;
    branch: string;
}, {
    owner: string;
    repo: string;
    branch?: string | undefined;
}>;
export declare const frontendFinderInputSchema: z.ZodObject<{
    repository: z.ZodObject<{
        owner: z.ZodString;
        repo: z.ZodString;
        branch: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        owner: string;
        repo: string;
        branch: string;
    }, {
        owner: string;
        repo: string;
        branch?: string | undefined;
    }>;
    codebasePath: z.ZodString;
    backendBatch: z.ZodObject<{
        batchId: z.ZodString;
        description: z.ZodString;
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
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
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
        }[];
        description: string;
        batchId: string;
    }, {
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
        }[];
        description: string;
        batchId: string;
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
    repository: {
        owner: string;
        repo: string;
        branch: string;
    };
    codebasePath: string;
    backendBatch: {
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
        }[];
        description: string;
        batchId: string;
    };
    options?: {
        maxSteps?: number | undefined;
        maxOutputTokens?: number | undefined;
        maxTotalTokens?: number | undefined;
    } | undefined;
}, {
    repository: {
        owner: string;
        repo: string;
        branch?: string | undefined;
    };
    codebasePath: string;
    backendBatch: {
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
        }[];
        description: string;
        batchId: string;
    };
    options?: {
        maxSteps?: number | undefined;
        maxOutputTokens?: number | undefined;
        maxTotalTokens?: number | undefined;
    } | undefined;
}>;
export declare const frontendImpactItemSchema: z.ZodObject<{
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
}>;
export declare const frontendImpactsSchema: z.ZodObject<{
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
    frontendImpacts: {
        file: string;
        description: string;
        backendBatchId: string;
        backendChangeId: string;
        frontendRepo: string;
        apiElement: string;
        severity: "high" | "medium" | "low";
    }[];
}>;
export type FrontendFinderInput = z.infer<typeof frontendFinderInputSchema>;
export type FrontendImpactsOutput = z.infer<typeof frontendImpactsSchema>;
//# sourceMappingURL=frontend-finder-schema.d.ts.map