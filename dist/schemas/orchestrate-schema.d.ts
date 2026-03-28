import { z } from "zod/v3";
import pino from "pino";
import { prCommentsSchema } from "./comment-generator-schema";
export declare const frontendConfigSchema: z.ZodObject<Pick<{
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
}, "options" | "repository" | "codebasePath">, "strip", z.ZodTypeAny, {
    repository: {
        owner: string;
        repo: string;
        branch: string;
    };
    codebasePath: string;
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
    options?: {
        maxSteps?: number | undefined;
        maxOutputTokens?: number | undefined;
        maxTotalTokens?: number | undefined;
    } | undefined;
}>;
export declare const orchestrateInputSchema: z.ZodObject<{
    backend: z.ZodObject<{
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
    frontends: z.ZodArray<z.ZodObject<Pick<{
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
    }, "options" | "repository" | "codebasePath">, "strip", z.ZodTypeAny, {
        repository: {
            owner: string;
            repo: string;
            branch: string;
        };
        codebasePath: string;
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
        options?: {
            maxSteps?: number | undefined;
            maxOutputTokens?: number | undefined;
            maxTotalTokens?: number | undefined;
        } | undefined;
    }>, "many">;
    openaiApiKey: z.ZodString;
    logLevel: z.ZodDefault<z.ZodOptional<z.ZodEnum<[pino.Level, ...pino.Level[]]>>>;
    frontendFinderConcurrencyLimit: z.ZodOptional<z.ZodNumber>;
    commentGeneratorOptions: z.ZodOptional<z.ZodObject<{
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
    prCommentPosterOptions: z.ZodOptional<z.ZodObject<{
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
    backend: {
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
    };
    frontends: {
        repository: {
            owner: string;
            repo: string;
            branch: string;
        };
        codebasePath: string;
        options?: {
            maxSteps?: number | undefined;
            maxOutputTokens?: number | undefined;
            maxTotalTokens?: number | undefined;
        } | undefined;
    }[];
    openaiApiKey: string;
    logLevel: pino.Level;
    frontendFinderConcurrencyLimit?: number | undefined;
    commentGeneratorOptions?: {
        maxSteps?: number | undefined;
        maxOutputTokens?: number | undefined;
        maxTotalTokens?: number | undefined;
    } | undefined;
    prCommentPosterOptions?: {
        maxSteps?: number | undefined;
        maxOutputTokens?: number | undefined;
        maxTotalTokens?: number | undefined;
    } | undefined;
}, {
    backend: {
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
    };
    frontends: {
        repository: {
            owner: string;
            repo: string;
            branch?: string | undefined;
        };
        codebasePath: string;
        options?: {
            maxSteps?: number | undefined;
            maxOutputTokens?: number | undefined;
            maxTotalTokens?: number | undefined;
        } | undefined;
    }[];
    openaiApiKey: string;
    logLevel?: pino.Level | undefined;
    frontendFinderConcurrencyLimit?: number | undefined;
    commentGeneratorOptions?: {
        maxSteps?: number | undefined;
        maxOutputTokens?: number | undefined;
        maxTotalTokens?: number | undefined;
    } | undefined;
    prCommentPosterOptions?: {
        maxSteps?: number | undefined;
        maxOutputTokens?: number | undefined;
        maxTotalTokens?: number | undefined;
    } | undefined;
}>;
export type OrchestrateInput = z.infer<typeof orchestrateInputSchema>;
export declare const backendChangeWithImpactsSchema: z.ZodObject<{
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
}>;
export type OrchestrateOutput = {
    changes: z.infer<typeof backendChangeWithImpactsSchema>[];
    prComments: z.infer<typeof prCommentsSchema>;
};
//# sourceMappingURL=orchestrate-schema.d.ts.map