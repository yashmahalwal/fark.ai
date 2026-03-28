import { z } from "zod/v3";
export declare const backendRepoSchema: z.ZodObject<{
    owner: z.ZodString;
    repo: z.ZodString;
    pull_number: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    owner: string;
    repo: string;
    pull_number: number;
}, {
    owner: string;
    repo: string;
    pull_number: number;
}>;
export declare const backendInputSchema: z.ZodObject<{
    repository: z.ZodObject<{
        owner: z.ZodString;
        repo: z.ZodString;
        pull_number: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        owner: string;
        repo: string;
        pull_number: number;
    }, {
        owner: string;
        repo: string;
        pull_number: number;
    }>;
    codebasePath: z.ZodString;
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
    repository: {
        owner: string;
        repo: string;
        pull_number: number;
    };
    codebasePath: string;
    githubMcp: {
        token: string;
        mcpServerUrl: string;
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
        pull_number: number;
    };
    codebasePath: string;
    githubMcp: {
        token: string;
        mcpServerUrl: string;
    };
    options?: {
        maxSteps?: number | undefined;
        maxOutputTokens?: number | undefined;
        maxTotalTokens?: number | undefined;
    } | undefined;
}>;
export declare const backendChangeItemSchema: z.ZodObject<{
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
}>;
export declare const backendChangeBatchSchema: z.ZodObject<{
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
export declare const backendChangesSchema: z.ZodObject<{
    batches: z.ZodArray<z.ZodObject<{
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
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    batches: {
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
    }[];
}, {
    batches: {
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
    }[];
}>;
export type BackendInput = z.infer<typeof backendInputSchema>;
export type BackendChangesOutput = z.infer<typeof backendChangesSchema>;
//# sourceMappingURL=be-analyzer-schema.d.ts.map