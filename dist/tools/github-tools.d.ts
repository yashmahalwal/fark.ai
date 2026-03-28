/**
 * Creates GitHub MCP client and returns tools
 * @param token GitHub token for authentication
 * @param serverUrl GitHub MCP server URL
 * @returns Object containing AI SDK tools and the MCP client
 */
export declare function getGitHubTools(token?: string, serverUrl?: string): Promise<{
    tools: Record<string, ({
        description?: string;
        title?: string;
        providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
        inputSchema: import("ai").FlexibleSchema<unknown>;
        inputExamples?: {
            input: unknown;
        }[] | undefined;
        needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<unknown> | undefined;
        strict?: boolean;
        onInputStart?: (options: import("ai").ToolExecutionOptions) => void | PromiseLike<void>;
        onInputDelta?: (options: {
            inputTextDelta: string;
        } & import("ai").ToolExecutionOptions) => void | PromiseLike<void>;
        onInputAvailable?: ((options: {
            input: unknown;
        } & import("ai").ToolExecutionOptions) => void | PromiseLike<void>) | undefined;
    } & {
        execute: import("ai").ToolExecuteFunction<unknown, {
            [x: string]: unknown;
            content: ({
                [x: string]: unknown;
                type: "text";
                text: string;
            } | {
                [x: string]: unknown;
                type: "image";
                data: string;
                mimeType: string;
            } | {
                [x: string]: unknown;
                type: "resource";
                resource: {
                    [x: string]: unknown;
                    uri: string;
                    text: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                } | {
                    [x: string]: unknown;
                    uri: string;
                    blob: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                };
            })[];
            _meta?: {
                [x: string]: unknown;
            } | undefined;
            isError?: boolean | undefined;
        } | {
            [x: string]: unknown;
            toolResult: unknown;
            _meta?: {
                [x: string]: unknown;
            } | undefined;
        }>;
        outputSchema?: import("ai").FlexibleSchema<{
            [x: string]: unknown;
            content: ({
                [x: string]: unknown;
                type: "text";
                text: string;
            } | {
                [x: string]: unknown;
                type: "image";
                data: string;
                mimeType: string;
            } | {
                [x: string]: unknown;
                type: "resource";
                resource: {
                    [x: string]: unknown;
                    uri: string;
                    text: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                } | {
                    [x: string]: unknown;
                    uri: string;
                    blob: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                };
            })[];
            _meta?: {
                [x: string]: unknown;
            } | undefined;
            isError?: boolean | undefined;
        } | {
            [x: string]: unknown;
            toolResult: unknown;
            _meta?: {
                [x: string]: unknown;
            } | undefined;
        }> | undefined;
    } & {
        toModelOutput?: ((options: {
            toolCallId: string;
            input: unknown;
            output: NoInfer<{
                [x: string]: unknown;
                content: ({
                    [x: string]: unknown;
                    type: "text";
                    text: string;
                } | {
                    [x: string]: unknown;
                    type: "image";
                    data: string;
                    mimeType: string;
                } | {
                    [x: string]: unknown;
                    type: "resource";
                    resource: {
                        [x: string]: unknown;
                        uri: string;
                        text: string;
                        name?: string | undefined;
                        title?: string | undefined;
                        mimeType?: string | undefined;
                    } | {
                        [x: string]: unknown;
                        uri: string;
                        blob: string;
                        name?: string | undefined;
                        title?: string | undefined;
                        mimeType?: string | undefined;
                    };
                })[];
                _meta?: {
                    [x: string]: unknown;
                } | undefined;
                isError?: boolean | undefined;
            } | {
                [x: string]: unknown;
                toolResult: unknown;
                _meta?: {
                    [x: string]: unknown;
                } | undefined;
            }>;
        }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>) | undefined;
    } & {
        type?: undefined | "function";
    } & Required<Pick<import("ai").Tool<unknown, {
        [x: string]: unknown;
        content: ({
            [x: string]: unknown;
            type: "text";
            text: string;
        } | {
            [x: string]: unknown;
            type: "image";
            data: string;
            mimeType: string;
        } | {
            [x: string]: unknown;
            type: "resource";
            resource: {
                [x: string]: unknown;
                uri: string;
                text: string;
                name?: string | undefined;
                title?: string | undefined;
                mimeType?: string | undefined;
            } | {
                [x: string]: unknown;
                uri: string;
                blob: string;
                name?: string | undefined;
                title?: string | undefined;
                mimeType?: string | undefined;
            };
        })[];
        _meta?: {
            [x: string]: unknown;
        } | undefined;
        isError?: boolean | undefined;
    } | {
        [x: string]: unknown;
        toolResult: unknown;
        _meta?: {
            [x: string]: unknown;
        } | undefined;
    }>, "execute">> & {
        _meta?: Record<string, unknown> | undefined;
    }) | ({
        description?: string;
        title?: string;
        providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
        inputSchema: import("ai").FlexibleSchema<unknown>;
        inputExamples?: {
            input: unknown;
        }[] | undefined;
        needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<unknown> | undefined;
        strict?: boolean;
        onInputStart?: (options: import("ai").ToolExecutionOptions) => void | PromiseLike<void>;
        onInputDelta?: (options: {
            inputTextDelta: string;
        } & import("ai").ToolExecutionOptions) => void | PromiseLike<void>;
        onInputAvailable?: ((options: {
            input: unknown;
        } & import("ai").ToolExecutionOptions) => void | PromiseLike<void>) | undefined;
    } & {
        execute: import("ai").ToolExecuteFunction<unknown, {
            [x: string]: unknown;
            content: ({
                [x: string]: unknown;
                type: "text";
                text: string;
            } | {
                [x: string]: unknown;
                type: "image";
                data: string;
                mimeType: string;
            } | {
                [x: string]: unknown;
                type: "resource";
                resource: {
                    [x: string]: unknown;
                    uri: string;
                    text: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                } | {
                    [x: string]: unknown;
                    uri: string;
                    blob: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                };
            })[];
            _meta?: {
                [x: string]: unknown;
            } | undefined;
            isError?: boolean | undefined;
        } | {
            [x: string]: unknown;
            toolResult: unknown;
            _meta?: {
                [x: string]: unknown;
            } | undefined;
        }>;
        outputSchema?: import("ai").FlexibleSchema<{
            [x: string]: unknown;
            content: ({
                [x: string]: unknown;
                type: "text";
                text: string;
            } | {
                [x: string]: unknown;
                type: "image";
                data: string;
                mimeType: string;
            } | {
                [x: string]: unknown;
                type: "resource";
                resource: {
                    [x: string]: unknown;
                    uri: string;
                    text: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                } | {
                    [x: string]: unknown;
                    uri: string;
                    blob: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                };
            })[];
            _meta?: {
                [x: string]: unknown;
            } | undefined;
            isError?: boolean | undefined;
        } | {
            [x: string]: unknown;
            toolResult: unknown;
            _meta?: {
                [x: string]: unknown;
            } | undefined;
        }> | undefined;
    } & {
        toModelOutput?: ((options: {
            toolCallId: string;
            input: unknown;
            output: NoInfer<{
                [x: string]: unknown;
                content: ({
                    [x: string]: unknown;
                    type: "text";
                    text: string;
                } | {
                    [x: string]: unknown;
                    type: "image";
                    data: string;
                    mimeType: string;
                } | {
                    [x: string]: unknown;
                    type: "resource";
                    resource: {
                        [x: string]: unknown;
                        uri: string;
                        text: string;
                        name?: string | undefined;
                        title?: string | undefined;
                        mimeType?: string | undefined;
                    } | {
                        [x: string]: unknown;
                        uri: string;
                        blob: string;
                        name?: string | undefined;
                        title?: string | undefined;
                        mimeType?: string | undefined;
                    };
                })[];
                _meta?: {
                    [x: string]: unknown;
                } | undefined;
                isError?: boolean | undefined;
            } | {
                [x: string]: unknown;
                toolResult: unknown;
                _meta?: {
                    [x: string]: unknown;
                } | undefined;
            }>;
        }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>) | undefined;
    } & {
        type: "dynamic";
    } & Required<Pick<import("ai").Tool<unknown, {
        [x: string]: unknown;
        content: ({
            [x: string]: unknown;
            type: "text";
            text: string;
        } | {
            [x: string]: unknown;
            type: "image";
            data: string;
            mimeType: string;
        } | {
            [x: string]: unknown;
            type: "resource";
            resource: {
                [x: string]: unknown;
                uri: string;
                text: string;
                name?: string | undefined;
                title?: string | undefined;
                mimeType?: string | undefined;
            } | {
                [x: string]: unknown;
                uri: string;
                blob: string;
                name?: string | undefined;
                title?: string | undefined;
                mimeType?: string | undefined;
            };
        })[];
        _meta?: {
            [x: string]: unknown;
        } | undefined;
        isError?: boolean | undefined;
    } | {
        [x: string]: unknown;
        toolResult: unknown;
        _meta?: {
            [x: string]: unknown;
        } | undefined;
    }>, "execute">> & {
        _meta?: Record<string, unknown> | undefined;
    }) | ({
        description?: string;
        title?: string;
        providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
        inputSchema: import("ai").FlexibleSchema<unknown>;
        inputExamples?: {
            input: unknown;
        }[] | undefined;
        needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<unknown> | undefined;
        strict?: boolean;
        onInputStart?: (options: import("ai").ToolExecutionOptions) => void | PromiseLike<void>;
        onInputDelta?: (options: {
            inputTextDelta: string;
        } & import("ai").ToolExecutionOptions) => void | PromiseLike<void>;
        onInputAvailable?: ((options: {
            input: unknown;
        } & import("ai").ToolExecutionOptions) => void | PromiseLike<void>) | undefined;
    } & {
        execute: import("ai").ToolExecuteFunction<unknown, {
            [x: string]: unknown;
            content: ({
                [x: string]: unknown;
                type: "text";
                text: string;
            } | {
                [x: string]: unknown;
                type: "image";
                data: string;
                mimeType: string;
            } | {
                [x: string]: unknown;
                type: "resource";
                resource: {
                    [x: string]: unknown;
                    uri: string;
                    text: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                } | {
                    [x: string]: unknown;
                    uri: string;
                    blob: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                };
            })[];
            _meta?: {
                [x: string]: unknown;
            } | undefined;
            isError?: boolean | undefined;
        } | {
            [x: string]: unknown;
            toolResult: unknown;
            _meta?: {
                [x: string]: unknown;
            } | undefined;
        }>;
        outputSchema?: import("ai").FlexibleSchema<{
            [x: string]: unknown;
            content: ({
                [x: string]: unknown;
                type: "text";
                text: string;
            } | {
                [x: string]: unknown;
                type: "image";
                data: string;
                mimeType: string;
            } | {
                [x: string]: unknown;
                type: "resource";
                resource: {
                    [x: string]: unknown;
                    uri: string;
                    text: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                } | {
                    [x: string]: unknown;
                    uri: string;
                    blob: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                };
            })[];
            _meta?: {
                [x: string]: unknown;
            } | undefined;
            isError?: boolean | undefined;
        } | {
            [x: string]: unknown;
            toolResult: unknown;
            _meta?: {
                [x: string]: unknown;
            } | undefined;
        }> | undefined;
    } & {
        toModelOutput?: ((options: {
            toolCallId: string;
            input: unknown;
            output: NoInfer<{
                [x: string]: unknown;
                content: ({
                    [x: string]: unknown;
                    type: "text";
                    text: string;
                } | {
                    [x: string]: unknown;
                    type: "image";
                    data: string;
                    mimeType: string;
                } | {
                    [x: string]: unknown;
                    type: "resource";
                    resource: {
                        [x: string]: unknown;
                        uri: string;
                        text: string;
                        name?: string | undefined;
                        title?: string | undefined;
                        mimeType?: string | undefined;
                    } | {
                        [x: string]: unknown;
                        uri: string;
                        blob: string;
                        name?: string | undefined;
                        title?: string | undefined;
                        mimeType?: string | undefined;
                    };
                })[];
                _meta?: {
                    [x: string]: unknown;
                } | undefined;
                isError?: boolean | undefined;
            } | {
                [x: string]: unknown;
                toolResult: unknown;
                _meta?: {
                    [x: string]: unknown;
                } | undefined;
            }>;
        }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>) | undefined;
    } & {
        type: "provider";
        id: `${string}.${string}`;
        args: Record<string, unknown>;
        supportsDeferredResults?: boolean;
    } & Required<Pick<import("ai").Tool<unknown, {
        [x: string]: unknown;
        content: ({
            [x: string]: unknown;
            type: "text";
            text: string;
        } | {
            [x: string]: unknown;
            type: "image";
            data: string;
            mimeType: string;
        } | {
            [x: string]: unknown;
            type: "resource";
            resource: {
                [x: string]: unknown;
                uri: string;
                text: string;
                name?: string | undefined;
                title?: string | undefined;
                mimeType?: string | undefined;
            } | {
                [x: string]: unknown;
                uri: string;
                blob: string;
                name?: string | undefined;
                title?: string | undefined;
                mimeType?: string | undefined;
            };
        })[];
        _meta?: {
            [x: string]: unknown;
        } | undefined;
        isError?: boolean | undefined;
    } | {
        [x: string]: unknown;
        toolResult: unknown;
        _meta?: {
            [x: string]: unknown;
        } | undefined;
    }>, "execute">> & {
        _meta?: Record<string, unknown> | undefined;
    })>;
    client: import("@ai-sdk/mcp").MCPClient;
}>;
/**
 * Gets tools for backend repository operations
 * Returns all tools from the MCP server
 * Tool limiting is done via AI SDK's activeTools in generateText
 */
export declare function getBackendTools(token: string, serverUrl: string): Promise<{
    tools: Record<string, ({
        description?: string;
        title?: string;
        providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
        inputSchema: import("ai").FlexibleSchema<unknown>;
        inputExamples?: {
            input: unknown;
        }[] | undefined;
        needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<unknown> | undefined;
        strict?: boolean;
        onInputStart?: (options: import("ai").ToolExecutionOptions) => void | PromiseLike<void>;
        onInputDelta?: (options: {
            inputTextDelta: string;
        } & import("ai").ToolExecutionOptions) => void | PromiseLike<void>;
        onInputAvailable?: ((options: {
            input: unknown;
        } & import("ai").ToolExecutionOptions) => void | PromiseLike<void>) | undefined;
    } & {
        execute: import("ai").ToolExecuteFunction<unknown, {
            [x: string]: unknown;
            content: ({
                [x: string]: unknown;
                type: "text";
                text: string;
            } | {
                [x: string]: unknown;
                type: "image";
                data: string;
                mimeType: string;
            } | {
                [x: string]: unknown;
                type: "resource";
                resource: {
                    [x: string]: unknown;
                    uri: string;
                    text: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                } | {
                    [x: string]: unknown;
                    uri: string;
                    blob: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                };
            })[];
            _meta?: {
                [x: string]: unknown;
            } | undefined;
            isError?: boolean | undefined;
        } | {
            [x: string]: unknown;
            toolResult: unknown;
            _meta?: {
                [x: string]: unknown;
            } | undefined;
        }>;
        outputSchema?: import("ai").FlexibleSchema<{
            [x: string]: unknown;
            content: ({
                [x: string]: unknown;
                type: "text";
                text: string;
            } | {
                [x: string]: unknown;
                type: "image";
                data: string;
                mimeType: string;
            } | {
                [x: string]: unknown;
                type: "resource";
                resource: {
                    [x: string]: unknown;
                    uri: string;
                    text: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                } | {
                    [x: string]: unknown;
                    uri: string;
                    blob: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                };
            })[];
            _meta?: {
                [x: string]: unknown;
            } | undefined;
            isError?: boolean | undefined;
        } | {
            [x: string]: unknown;
            toolResult: unknown;
            _meta?: {
                [x: string]: unknown;
            } | undefined;
        }> | undefined;
    } & {
        toModelOutput?: ((options: {
            toolCallId: string;
            input: unknown;
            output: NoInfer<{
                [x: string]: unknown;
                content: ({
                    [x: string]: unknown;
                    type: "text";
                    text: string;
                } | {
                    [x: string]: unknown;
                    type: "image";
                    data: string;
                    mimeType: string;
                } | {
                    [x: string]: unknown;
                    type: "resource";
                    resource: {
                        [x: string]: unknown;
                        uri: string;
                        text: string;
                        name?: string | undefined;
                        title?: string | undefined;
                        mimeType?: string | undefined;
                    } | {
                        [x: string]: unknown;
                        uri: string;
                        blob: string;
                        name?: string | undefined;
                        title?: string | undefined;
                        mimeType?: string | undefined;
                    };
                })[];
                _meta?: {
                    [x: string]: unknown;
                } | undefined;
                isError?: boolean | undefined;
            } | {
                [x: string]: unknown;
                toolResult: unknown;
                _meta?: {
                    [x: string]: unknown;
                } | undefined;
            }>;
        }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>) | undefined;
    } & {
        type?: undefined | "function";
    } & Required<Pick<import("ai").Tool<unknown, {
        [x: string]: unknown;
        content: ({
            [x: string]: unknown;
            type: "text";
            text: string;
        } | {
            [x: string]: unknown;
            type: "image";
            data: string;
            mimeType: string;
        } | {
            [x: string]: unknown;
            type: "resource";
            resource: {
                [x: string]: unknown;
                uri: string;
                text: string;
                name?: string | undefined;
                title?: string | undefined;
                mimeType?: string | undefined;
            } | {
                [x: string]: unknown;
                uri: string;
                blob: string;
                name?: string | undefined;
                title?: string | undefined;
                mimeType?: string | undefined;
            };
        })[];
        _meta?: {
            [x: string]: unknown;
        } | undefined;
        isError?: boolean | undefined;
    } | {
        [x: string]: unknown;
        toolResult: unknown;
        _meta?: {
            [x: string]: unknown;
        } | undefined;
    }>, "execute">> & {
        _meta?: Record<string, unknown> | undefined;
    }) | ({
        description?: string;
        title?: string;
        providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
        inputSchema: import("ai").FlexibleSchema<unknown>;
        inputExamples?: {
            input: unknown;
        }[] | undefined;
        needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<unknown> | undefined;
        strict?: boolean;
        onInputStart?: (options: import("ai").ToolExecutionOptions) => void | PromiseLike<void>;
        onInputDelta?: (options: {
            inputTextDelta: string;
        } & import("ai").ToolExecutionOptions) => void | PromiseLike<void>;
        onInputAvailable?: ((options: {
            input: unknown;
        } & import("ai").ToolExecutionOptions) => void | PromiseLike<void>) | undefined;
    } & {
        execute: import("ai").ToolExecuteFunction<unknown, {
            [x: string]: unknown;
            content: ({
                [x: string]: unknown;
                type: "text";
                text: string;
            } | {
                [x: string]: unknown;
                type: "image";
                data: string;
                mimeType: string;
            } | {
                [x: string]: unknown;
                type: "resource";
                resource: {
                    [x: string]: unknown;
                    uri: string;
                    text: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                } | {
                    [x: string]: unknown;
                    uri: string;
                    blob: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                };
            })[];
            _meta?: {
                [x: string]: unknown;
            } | undefined;
            isError?: boolean | undefined;
        } | {
            [x: string]: unknown;
            toolResult: unknown;
            _meta?: {
                [x: string]: unknown;
            } | undefined;
        }>;
        outputSchema?: import("ai").FlexibleSchema<{
            [x: string]: unknown;
            content: ({
                [x: string]: unknown;
                type: "text";
                text: string;
            } | {
                [x: string]: unknown;
                type: "image";
                data: string;
                mimeType: string;
            } | {
                [x: string]: unknown;
                type: "resource";
                resource: {
                    [x: string]: unknown;
                    uri: string;
                    text: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                } | {
                    [x: string]: unknown;
                    uri: string;
                    blob: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                };
            })[];
            _meta?: {
                [x: string]: unknown;
            } | undefined;
            isError?: boolean | undefined;
        } | {
            [x: string]: unknown;
            toolResult: unknown;
            _meta?: {
                [x: string]: unknown;
            } | undefined;
        }> | undefined;
    } & {
        toModelOutput?: ((options: {
            toolCallId: string;
            input: unknown;
            output: NoInfer<{
                [x: string]: unknown;
                content: ({
                    [x: string]: unknown;
                    type: "text";
                    text: string;
                } | {
                    [x: string]: unknown;
                    type: "image";
                    data: string;
                    mimeType: string;
                } | {
                    [x: string]: unknown;
                    type: "resource";
                    resource: {
                        [x: string]: unknown;
                        uri: string;
                        text: string;
                        name?: string | undefined;
                        title?: string | undefined;
                        mimeType?: string | undefined;
                    } | {
                        [x: string]: unknown;
                        uri: string;
                        blob: string;
                        name?: string | undefined;
                        title?: string | undefined;
                        mimeType?: string | undefined;
                    };
                })[];
                _meta?: {
                    [x: string]: unknown;
                } | undefined;
                isError?: boolean | undefined;
            } | {
                [x: string]: unknown;
                toolResult: unknown;
                _meta?: {
                    [x: string]: unknown;
                } | undefined;
            }>;
        }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>) | undefined;
    } & {
        type: "dynamic";
    } & Required<Pick<import("ai").Tool<unknown, {
        [x: string]: unknown;
        content: ({
            [x: string]: unknown;
            type: "text";
            text: string;
        } | {
            [x: string]: unknown;
            type: "image";
            data: string;
            mimeType: string;
        } | {
            [x: string]: unknown;
            type: "resource";
            resource: {
                [x: string]: unknown;
                uri: string;
                text: string;
                name?: string | undefined;
                title?: string | undefined;
                mimeType?: string | undefined;
            } | {
                [x: string]: unknown;
                uri: string;
                blob: string;
                name?: string | undefined;
                title?: string | undefined;
                mimeType?: string | undefined;
            };
        })[];
        _meta?: {
            [x: string]: unknown;
        } | undefined;
        isError?: boolean | undefined;
    } | {
        [x: string]: unknown;
        toolResult: unknown;
        _meta?: {
            [x: string]: unknown;
        } | undefined;
    }>, "execute">> & {
        _meta?: Record<string, unknown> | undefined;
    }) | ({
        description?: string;
        title?: string;
        providerOptions?: import("@ai-sdk/provider-utils").ProviderOptions;
        inputSchema: import("ai").FlexibleSchema<unknown>;
        inputExamples?: {
            input: unknown;
        }[] | undefined;
        needsApproval?: boolean | import("@ai-sdk/provider-utils").ToolNeedsApprovalFunction<unknown> | undefined;
        strict?: boolean;
        onInputStart?: (options: import("ai").ToolExecutionOptions) => void | PromiseLike<void>;
        onInputDelta?: (options: {
            inputTextDelta: string;
        } & import("ai").ToolExecutionOptions) => void | PromiseLike<void>;
        onInputAvailable?: ((options: {
            input: unknown;
        } & import("ai").ToolExecutionOptions) => void | PromiseLike<void>) | undefined;
    } & {
        execute: import("ai").ToolExecuteFunction<unknown, {
            [x: string]: unknown;
            content: ({
                [x: string]: unknown;
                type: "text";
                text: string;
            } | {
                [x: string]: unknown;
                type: "image";
                data: string;
                mimeType: string;
            } | {
                [x: string]: unknown;
                type: "resource";
                resource: {
                    [x: string]: unknown;
                    uri: string;
                    text: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                } | {
                    [x: string]: unknown;
                    uri: string;
                    blob: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                };
            })[];
            _meta?: {
                [x: string]: unknown;
            } | undefined;
            isError?: boolean | undefined;
        } | {
            [x: string]: unknown;
            toolResult: unknown;
            _meta?: {
                [x: string]: unknown;
            } | undefined;
        }>;
        outputSchema?: import("ai").FlexibleSchema<{
            [x: string]: unknown;
            content: ({
                [x: string]: unknown;
                type: "text";
                text: string;
            } | {
                [x: string]: unknown;
                type: "image";
                data: string;
                mimeType: string;
            } | {
                [x: string]: unknown;
                type: "resource";
                resource: {
                    [x: string]: unknown;
                    uri: string;
                    text: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                } | {
                    [x: string]: unknown;
                    uri: string;
                    blob: string;
                    name?: string | undefined;
                    title?: string | undefined;
                    mimeType?: string | undefined;
                };
            })[];
            _meta?: {
                [x: string]: unknown;
            } | undefined;
            isError?: boolean | undefined;
        } | {
            [x: string]: unknown;
            toolResult: unknown;
            _meta?: {
                [x: string]: unknown;
            } | undefined;
        }> | undefined;
    } & {
        toModelOutput?: ((options: {
            toolCallId: string;
            input: unknown;
            output: NoInfer<{
                [x: string]: unknown;
                content: ({
                    [x: string]: unknown;
                    type: "text";
                    text: string;
                } | {
                    [x: string]: unknown;
                    type: "image";
                    data: string;
                    mimeType: string;
                } | {
                    [x: string]: unknown;
                    type: "resource";
                    resource: {
                        [x: string]: unknown;
                        uri: string;
                        text: string;
                        name?: string | undefined;
                        title?: string | undefined;
                        mimeType?: string | undefined;
                    } | {
                        [x: string]: unknown;
                        uri: string;
                        blob: string;
                        name?: string | undefined;
                        title?: string | undefined;
                        mimeType?: string | undefined;
                    };
                })[];
                _meta?: {
                    [x: string]: unknown;
                } | undefined;
                isError?: boolean | undefined;
            } | {
                [x: string]: unknown;
                toolResult: unknown;
                _meta?: {
                    [x: string]: unknown;
                } | undefined;
            }>;
        }) => import("@ai-sdk/provider-utils").ToolResultOutput | PromiseLike<import("@ai-sdk/provider-utils").ToolResultOutput>) | undefined;
    } & {
        type: "provider";
        id: `${string}.${string}`;
        args: Record<string, unknown>;
        supportsDeferredResults?: boolean;
    } & Required<Pick<import("ai").Tool<unknown, {
        [x: string]: unknown;
        content: ({
            [x: string]: unknown;
            type: "text";
            text: string;
        } | {
            [x: string]: unknown;
            type: "image";
            data: string;
            mimeType: string;
        } | {
            [x: string]: unknown;
            type: "resource";
            resource: {
                [x: string]: unknown;
                uri: string;
                text: string;
                name?: string | undefined;
                title?: string | undefined;
                mimeType?: string | undefined;
            } | {
                [x: string]: unknown;
                uri: string;
                blob: string;
                name?: string | undefined;
                title?: string | undefined;
                mimeType?: string | undefined;
            };
        })[];
        _meta?: {
            [x: string]: unknown;
        } | undefined;
        isError?: boolean | undefined;
    } | {
        [x: string]: unknown;
        toolResult: unknown;
        _meta?: {
            [x: string]: unknown;
        } | undefined;
    }>, "execute">> & {
        _meta?: Record<string, unknown> | undefined;
    })>;
    client: import("@ai-sdk/mcp").MCPClient;
}>;
//# sourceMappingURL=github-tools.d.ts.map