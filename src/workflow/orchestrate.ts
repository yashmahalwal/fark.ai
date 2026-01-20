// import { analyzeBackendDiff } from "../agents/be-analyzer"; // Commented out for testing
// import { generatePRComments } from "../agents/comment-generator"; // Commented out for testing
// import { findFrontendImpacts } from "../agents/frontend-finder"; // Commented out for testing
import { postPRComments } from "../agents/pr-comment-poster";
import { getBackendTools, getFrontendTools } from "../tools/github-tools";
// import { getFrontendTools } from "../tools/github-tools"; // Commented out for testing
import pino from "pino";
import { z } from "zod/v3";
import {
  orchestrateInputSchema,
  backendChangeWithImpactsSchema,
  type OrchestrateInput,
  type OrchestrateOutput,
} from "../schemas/orchestrate-schema";
import { frontendImpactItemSchema } from "../schemas/frontend-finder-schema";
import { analyzeBackendDiff } from "../agents/be-analyzer";
import { generatePRComments } from "../agents/comment-generator";
import { findFrontendImpacts } from "../agents/frontend-finder";

// Re-export for backward compatibility
export {
  backendChangeWithImpactsSchema,
  type OrchestrateInput,
  type OrchestrateOutput,
} from "../schemas/orchestrate-schema";

// const backendChangesResult = {
//   backendChanges: [
//     {
//       id: "0",
//       file: "src/graphql/schema.ts",
//       diffHunks: [
//         {
//           startLine: 1,
//           endLine: 50,
//           changes: [
//             "- type Address {",
//             "-   street: String",
//             "-   city: String",
//             "-   zipCode: String",
//             "-   country: String",
//             "+ type Address {",
//             "+   location: Location!",
//             "+   postal: Postal!",
//           ],
//         },
//       ],
//       impact: "objectStructureChanged",
//       description:
//         "GraphQL type Address was restructured from a flat object to nested sub-objects. Old: {street, city, zipCode, country}. New: {location: {street, city}, postal: {zipCode, country}}. Client impact: Queries like order { shippingAddress { street city zipCode country } } will fail to compile/execute; clients must instead query order { shippingAddress { location { street city } postal { zipCode country } } }. Why: Internal Address model was refactored (src/types/models.ts) to nested location/postal, and resolvers now shape data accordingly.",
//     },
//     {
//       id: "1",
//       file: "src/graphql/schema.ts",
//       diffHunks: [
//         {
//           startLine: 51,
//           endLine: 100,
//           changes: [
//             "- input AddressInput {",
//             "-   street: String",
//             "-   city: String",
//             "-   zipCode: String",
//             "-   country: String",
//             "+ input AddressInput {",
//             "+   location: LocationInput!",
//             "+   postal: PostalInput!",
//           ],
//         },
//       ],
//       impact: "objectStructureChanged",
//       description:
//         "GraphQL input AddressInput was restructured from flat fields to nested inputs. Old: AddressInput { street, city, zipCode, country }. New: AddressInput { location: LocationInput!, postal: PostalInput! }. Client impact: Mutations createOrder/updateOrder variables using flat address fields will be rejected by schema validation; clients must send nested address variables. Why: Matches internal Address model refactor and new resolver validation requiring shippingAddress.location and shippingAddress.postal.",
//     },
//     {
//       id: "2",
//       file: "src/rest/routes.ts",
//       diffHunks: [
//         {
//           startLine: 101,
//           endLine: 150,
//           changes: [
//             "-   shippingAddress: {",
//             "-     street,",
//             "-     city,",
//             "-     zipCode,",
//             "-     country",
//             "-   }",
//             "+   shippingAddress: {",
//             "+     location: { street, city },",
//             "+     postal: { zipCode, country }",
//             "+   }",
//           ],
//         },
//       ],
//       impact: "objectStructureChanged",
//       description:
//         "REST GET /orders/:id response changed the shape of shippingAddress. Old response: shippingAddress = {street, city, zipCode, country}. New response: shippingAddress = { location: {street, city}, postal: {zipCode, country} }. Client impact: Consumers deserializing to the old flat structure will fail (deserialization errors in strict clients) or miss fields. Why: Aligns REST responses with the internal Address model refactor and GraphQL changes.",
//     },
//     {
//       id: "3",
//       file: "src/rest/routes.ts",
//       diffHunks: [
//         {
//           startLine: 151,
//           endLine: 200,
//           changes: [
//             "-   shippingAddress: {",
//             "-     street,",
//             "-     city,",
//             "-     zipCode,",
//             "-     country",
//             "-   }",
//             "+   shippingAddress: {",
//             "+     location: { street, city },",
//             "+     postal: { zipCode, country }",
//             "+   }",
//           ],
//         },
//       ],
//       impact: "objectStructureChanged",
//       description:
//         "REST GET /orders response changed the shape of shippingAddress for each item, from flat fields to nested location/postal sub-objects. Client impact: Batch consumers expecting flat fields will fail to parse or will not find expected fields. Why: Brought REST list response in line with the nested Address model.",
//     },
//     {
//       id: "4",
//       file: "src/rest/routes.ts",
//       diffHunks: [
//         {
//           startLine: 201,
//           endLine: 250,
//           changes: [
//             "-   shippingAddress?: {",
//             "+   shippingAddress: {",
//             "+     location: { street: string, city: string }",
//             "+     postal: { zipCode: string, country: string }",
//             "+   }",
//           ],
//         },
//       ],
//       impact: "nullableToRequired",
//       description:
//         "REST POST /orders now requires shippingAddress.location and shippingAddress.postal to be present. Previously, shippingAddress was effectively optional (server stored {} when absent). Client impact: Requests that omitted shippingAddress or sent only flat fields will now receive HTTP 400. Why: Enforces new nested Address structure at write time.",
//     },
//     {
//       id: "5",
//       file: "src/rest/routes.ts",
//       diffHunks: [
//         {
//           startLine: 251,
//           endLine: 300,
//           changes: [
//             "-   shippingAddress?: {",
//             "-     street,",
//             "-     city,",
//             "-     zipCode,",
//             "-     country",
//             "-   }",
//             "+   shippingAddress: {",
//             "+     location: { street, city },",
//             "+     postal: { zipCode, country }",
//             "+   }",
//           ],
//         },
//       ],
//       impact: "objectStructureChanged",
//       description:
//         "REST POST /orders request body shippingAddress structure changed. Old accepted shape: shippingAddress={street, city, zipCode, country} (and could be omitted). New required shape: shippingAddress={ location:{street, city}, postal:{zipCode, country} }. Client impact: Bodies using the old flat structure will be rejected with HTTP 400 or, in strict clients, fail schema validation prior to sending.",
//     },
//     {
//       id: "6",
//       file: "src/rest/routes.ts",
//       diffHunks: [
//         {
//           startLine: 301,
//           endLine: 350,
//           changes: [
//             "-   shippingAddress?: {",
//             "+   shippingAddress: {",
//             "+     location: { street: string, city: string }",
//             "+     postal: { zipCode: string, country: string }",
//             "+   }",
//           ],
//         },
//       ],
//       impact: "nullableToRequired",
//       description:
//         "REST PUT /orders/:id now requires shippingAddress.location and shippingAddress.postal to be present. Previously, shippingAddress could be omitted or be empty. Client impact: Updates that omit shippingAddress or provide only flat fields now receive HTTP 400. Why: Aligns update validation with new nested Address model.",
//     },
//     {
//       id: "7",
//       file: "src/rest/routes.ts",
//       diffHunks: [
//         {
//           startLine: 351,
//           endLine: 400,
//           changes: [
//             "-   shippingAddress?: {",
//             "-     street,",
//             "-     city,",
//             "-     zipCode,",
//             "-     country",
//             "-   }",
//             "+   shippingAddress: {",
//             "+     location: { street, city },",
//             "+     postal: { zipCode, country }",
//             "+   }",
//           ],
//         },
//       ],
//       impact: "objectStructureChanged",
//       description:
//         "REST PUT /orders/:id request body shippingAddress structure changed from flat to nested. Old: shippingAddress={street, city, zipCode, country}. New: shippingAddress={ location:{street, city}, postal:{zipCode, country} }. Client impact: Existing clients sending flat address objects will be rejected.",
//     },
//   ],
// };

// Test data: Frontend impacts found from BE changes (for testing only)
// Format: Each impact includes frontendRepo with owner, repo, and branch
// const allFrontendImpacts: z.infer<typeof frontendImpactItemSchema>[] = [
//   // Frontend demo impacts
//   {
//     backendChangeId: "0",
//     frontendRepo: {
//       owner: "yashmahalwal",
//       repo: "fark-frontend-demo",
//       branch: "main",
//     },
//     file: "src/api/graphql.ts",
//     apiElement: "GET_ORDERS.shippingAddress.street|city|zipCode|country",
//     description:
//       "GraphQL query GET_ORDERS selects flat fields on Address that no longer exist. The server now exposes shippingAddress as nested location/postal, so this query will fail GraphQL validation/execution and the orders list won't load.",
//     severity: "high" as const,
//   },
//   {
//     backendChangeId: "0",
//     frontendRepo: {
//       owner: "yashmahalwal",
//       repo: "fark-frontend-demo",
//       branch: "main",
//     },
//     file: "src/components/GraphQLOrdersComponent.tsx",
//     apiElement: "order.shippingAddress.street (render)",
//     description:
//       "Component renders order.shippingAddress.street and .city assuming a flat Address. With the new nested schema, these properties are under shippingAddress.location and shippingAddress.postal, so reads will be undefined even if the query is fixed.",
//     severity: "high" as const,
//   },
//   {
//     backendChangeId: "1",
//     frontendRepo: {
//       owner: "yashmahalwal",
//       repo: "fark-frontend-demo",
//       branch: "main",
//     },
//     file: "src/components/GraphQLOrdersComponent.tsx",
//     apiElement: "CREATE_ORDER/UPDATE_ORDER variables.shippingAddress",
//     description:
//       "Mutations build variables with a flat shippingAddress object. AddressInput now requires nested location and postal objects, so these mutations will be rejected by GraphQL input validation (400-level GraphQL errors).",
//     severity: "high" as const,
//   },
//   {
//     backendChangeId: "3",
//     frontendRepo: {
//       owner: "yashmahalwal",
//       repo: "fark-frontend-demo",
//       branch: "main",
//     },
//     file: "src/components/RestOrdersComponent.tsx",
//     apiElement: "GET /api/orders -> order.shippingAddress.street|city (render)",
//     description:
//       "REST list response now returns shippingAddress as nested location/postal. The component renders flat fields (street, city) and will read undefined values, breaking the UI for the orders table.",
//     severity: "high" as const,
//   },
//   {
//     backendChangeId: "5",
//     frontendRepo: {
//       owner: "yashmahalwal",
//       repo: "fark-frontend-demo",
//       branch: "main",
//     },
//     file: "src/api/rest.ts",
//     apiElement: "POST /api/orders request body.shippingAddress",
//     description:
//       "createOrder sends shippingAddress as a flat object. The backend now requires shippingAddress to be nested (location + postal), so create requests will fail with HTTP 400.",
//     severity: "high" as const,
//   },
//   // Mobile demo impacts
//   {
//     backendChangeId: "7",
//     frontendRepo: {
//       owner: "yashmahalwal",
//       repo: "fark-mobile-demo",
//       branch: "main",
//     },
//     file: "src/api/rest.ts",
//     apiElement: "PUT /api/orders/:id request body.shippingAddress",
//     description:
//       "updateOrder sends shippingAddress as a flat object. The backend now requires nested location/postal, so update requests will fail with HTTP 400.",
//     severity: "high" as const,
//   },
//   {
//     backendChangeId: "0",
//     frontendRepo: {
//       owner: "yashmahalwal",
//       repo: "fark-mobile-demo",
//       branch: "main",
//     },
//     file: "app/src/main/graphql/com/fark/mobiledemo/graphql/GetOrdersQuery.graphql",
//     apiElement: "orders.shippingAddress.street|city|zipCode|country",
//     description:
//       "GraphQL query selects flat shippingAddress fields that no longer exist. With Address now nested under location and postal, this query will fail to compile/execute against the server until updated to request shippingAddress { location { street city } postal { zipCode country } }.",
//     severity: "high" as const,
//   },
//   {
//     backendChangeId: "0",
//     frontendRepo: {
//       owner: "yashmahalwal",
//       repo: "fark-mobile-demo",
//       branch: "main",
//     },
//     file: "app/src/main/java/com/fark/mobiledemo/api/graphql/GraphQLClient.kt",
//     apiElement:
//       "GetOrdersQuery response mapping (orderData.shippingAddress.street|city|zipCode|country)",
//     description:
//       "Response mapping assumes shippingAddress has flat fields. After the schema change, returned data is nested (location/postal), so this mapping will crash or fail at runtime until updated to read nested fields.",
//     severity: "high" as const,
//   },
//   {
//     backendChangeId: "1",
//     frontendRepo: {
//       owner: "yashmahalwal",
//       repo: "fark-mobile-demo",
//       branch: "main",
//     },
//     file: "app/src/main/java/com/fark/mobiledemo/api/graphql/GraphQLClient.kt",
//     apiElement:
//       "CreateOrderMutation/UpdateOrderMutation variables (AddressInput)",
//     description:
//       "Client constructs AddressInput with flat fields (street, city, zipCode, country). The server now requires AddressInput with nested location and postal. Mutations will be rejected by GraphQL variable validation until variables are sent as shippingAddress: { location: { street, city }, postal: { zipCode, country } }.",
//     severity: "high" as const,
//   },
//   {
//     backendChangeId: "1",
//     frontendRepo: {
//       owner: "yashmahalwal",
//       repo: "fark-mobile-demo",
//       branch: "main",
//     },
//     file: "app/src/main/graphql/com/fark/mobiledemo/graphql/CreateOrderMutation.graphql",
//     apiElement: "createOrder(shippingAddress: AddressInput) variable shape",
//     description:
//       "Operation expects to pass flat AddressInput fields via variables. With the new nested AddressInput, this mutation will fail at execution unless the variable shape is updated to include location and postal.",
//     severity: "high" as const,
//   },
//   {
//     backendChangeId: "1",
//     frontendRepo: {
//       owner: "yashmahalwal",
//       repo: "fark-mobile-demo",
//       branch: "main",
//     },
//     file: "app/src/main/graphql/com/fark/mobiledemo/graphql/UpdateOrderMutation.graphql",
//     apiElement: "updateOrder(shippingAddress: AddressInput) variable shape",
//     description:
//       "Same as createOrder: mutation variables currently assume flat address fields; server now requires nested location/postal, causing execution errors until updated.",
//     severity: "high" as const,
//   },
//   {
//     backendChangeId: "3",
//     frontendRepo: {
//       owner: "yashmahalwal",
//       repo: "fark-mobile-demo",
//       branch: "main",
//     },
//     file: "app/src/main/java/com/fark/mobiledemo/models/Models.kt",
//     apiElement:
//       "Address (street, city, zipCode, country) used in Order.shippingAddress",
//     description:
//       "REST GET /orders now returns shippingAddress with nested location/postal. The Address data class expects flat fields, so deserialization into Order will fail (missing fields for a non-null Address).",
//     severity: "high" as const,
//   },
//   {
//     backendChangeId: "3",
//     frontendRepo: {
//       owner: "yashmahalwal",
//       repo: "fark-mobile-demo",
//       branch: "main",
//     },
//     file: "app/src/main/java/com/fark/mobiledemo/api/rest/RestApiClient.kt",
//     apiElement: "GET /orders response deserialization into Array<Order>",
//     description:
//       "Client parses /orders response directly into Order (with flat Address). With nested shippingAddress in the response, Gson deserialization will fail or produce invalid objects.",
//     severity: "high" as const,
//   },
//   {
//     backendChangeId: "5",
//     frontendRepo: {
//       owner: "yashmahalwal",
//       repo: "fark-mobile-demo",
//       branch: "main",
//     },
//     file: "app/src/main/java/com/fark/mobiledemo/api/rest/RestApi.kt",
//     apiElement: "CreateOrderRequest.shippingAddress: Map<String, String>",
//     description:
//       "POST /orders now requires shippingAddress with nested location/postal. The request model still sends a flat map of street/city/zipCode/country, which the server will reject (HTTP 400).",
//     severity: "high" as const,
//   },
//   {
//     backendChangeId: "5",
//     frontendRepo: {
//       owner: "yashmahalwal",
//       repo: "fark-mobile-demo",
//       branch: "main",
//     },
//     file: "app/src/main/java/com/fark/mobiledemo/api/rest/RestApiClient.kt",
//     apiElement: "POST /orders request body shippingAddress (flat fields)",
//     description:
//       "Client builds shippingAddress as a flat map with street/city/zipCode/country for createOrder. Backend expects nested structure; requests will fail with 400 until the body is updated.",
//     severity: "high" as const,
//   },
//   {
//     backendChangeId: "7",
//     frontendRepo: {
//       owner: "yashmahalwal",
//       repo: "fark-mobile-demo",
//       branch: "main",
//     },
//     file: "app/src/main/java/com/fark/mobiledemo/api/rest/RestApiClient.kt",
//     apiElement: "PUT /orders/:id request body shippingAddress (flat fields)",
//     description:
//       "Client uses the same flat shippingAddress map for updateOrder. Backend now requires nested location/postal; update requests will be rejected with 400.",
//     severity: "high" as const,
//   },
// ];


// Test data: PR Comments generated by comment generator (for testing only)
// const prComments: PRCommentsOutput = {
//   summary:
//     "## Summary of Breaking Changes\n\nThis PR introduces **8 breaking API changes** affecting both the GraphQL schema and REST endpoints. Key changes include restructuring of the `Address` object into nested sub-objects, leading to significant impacts on both frontend and mobile applications. Key highlights:\n- **GraphQL `Address` Type Restructured**: `Address` fields are now nested under `location` and `postal` objects.\n- **REST APIs Updated**: Multiple endpoints now require nested `shippingAddress` fields.\n- Clients must update data models and deserialization logic to prevent runtime errors.\n\n**Frontend Impact**: High - Requires updates across several frontend components to handle the new data structure.",
//   comments: [
//     {
//       path: "src/graphql/schema.ts",
//       line: 1,
//       startLine: 1,
//       endLine: 50,
//       side: "RIGHT",
//       startSide: "RIGHT",
//       body: "⚠️ **Breaking API Change**\n\nGraphQL type `Address` was restructured from a flat object to nested sub-objects.\n\n**Technical Details:**\n- Changed from `{street, city, zipCode, country}` to `{location: {street, city}, postal: {zipCode, country}}`\n- Affects: `order { shippingAddress { ... } }` queries\n\n**Frontend Impact:**\n- **yashmahalwal/fark-frontend-demo**: `src/api/graphql.ts` - Query fields no longer exist, will fail validation (high)\n- **yashmahalwal/fark-frontend-demo**: `src/components/GraphQLOrdersComponent.tsx` - Renders fields assuming flat structure, reads undefined (high)\n- **yashmahalwal/fark-mobile-demo**: `app/src/main/graphql/com/fark/mobiledemo/graphql/GetOrdersQuery.graphql` - Will fail to compile/execute (high)\n- **yashmahalwal/fark-mobile-demo**: `app/src/main/java/com/fark/mobiledemo/api/graphql/GraphQLClient.kt` - Response mapping will fail (high)",
//     },
//     {
//       path: "src/graphql/schema.ts",
//       line: 51,
//       startLine: 51,
//       endLine: 100,
//       side: "RIGHT",
//       startSide: "RIGHT",
//       body: "⚠️ **Breaking API Change**\n\nGraphQL input `AddressInput` was restructured from flat fields to nested inputs.\n\n**Technical Details:**\n- Changed from `{street, city, zipCode, country}` to `{location: LocationInput!, postal: PostalInput!}`\n- Affects: `createOrder/updateOrder` input variables\n\n**Frontend Impact:**\n- **yashmahalwal/fark-frontend-demo**: `src/components/GraphQLOrdersComponent.tsx` - Mutation variables will be rejected (high)\n- **yashmahalwal/fark-mobile-demo**: `app/src/main/java/com/fark/mobiledemo/api/graphql/GraphQLClient.kt` - Mutation inputs will fail validation (high)\n- **yashmahalwal/fark-mobile-demo**: `app/src/main/graphql/com/fark/mobiledemo/graphql/CreateOrderMutation.graphql` - Variable shape mismatch (high)\n- **yashmahalwal/fark-mobile-demo**: `app/src/main/graphql/com/fark/mobiledemo/graphql/UpdateOrderMutation.graphql` - Variable shape mismatch (high)",
//     },
//     {
//       path: "src/rest/routes.ts",
//       line: 101,
//       startLine: 101,
//       endLine: 150,
//       side: "RIGHT",
//       startSide: "RIGHT",
//       body: "⚠️ **Breaking API Change**\n\nREST GET `/orders/:id` changed the shape of `shippingAddress`.\n\n**Technical Details:**\n- From `shippingAddress={street, city, zipCode, country}` to `shippingAddress={ location: {street, city}, postal: {zipCode, country} }`\n\n**Frontend Impact:**\n- No frontend impacts detected",
//     },
//     {
//       path: "src/rest/routes.ts",
//       line: 151,
//       startLine: 151,
//       endLine: 200,
//       side: "RIGHT",
//       startSide: "RIGHT",
//       body: "⚠️ **Breaking API Change**\n\nREST GET `/orders` changed the shape of `shippingAddress` for each item.\n\n**Technical Details:**\n- From flat fields to nested `location/postal` objects\n\n**Frontend Impact:**\n- **yashmahalwal/fark-frontend-demo**: `src/components/RestOrdersComponent.tsx` - Renders undefined values, breaking UI (high)\n- **yashmahalwal/fark-mobile-demo**: `app/src/main/java/com/fark/mobiledemo/models/Models.kt` - Deserialization failure, missing fields (high)\n- **yashmahalwal/fark-mobile-demo**: `app/src/main/java/com/fark/mobiledemo/api/rest/RestApiClient.kt` - Deserialization produces invalid objects (high)",
//     },
//     {
//       path: "src/rest/routes.ts",
//       line: 201,
//       startLine: 201,
//       endLine: 250,
//       side: "RIGHT",
//       startSide: "RIGHT",
//       body: "⚠️ **Breaking API Change**\n\nREST POST `/orders` now requires `shippingAddress.location` and `postal`.\n\n**Technical Details:**\n- Previously, `shippingAddress` was optional\n\n**Frontend Impact:**\n- No frontend impacts detected",
//     },
//     {
//       path: "src/rest/routes.ts",
//       line: 251,
//       startLine: 251,
//       endLine: 300,
//       side: "RIGHT",
//       startSide: "RIGHT",
//       body: "⚠️ **Breaking API Change**\n\nREST POST `/orders` request body `shippingAddress` structure changed.\n\n**Technical Details:**\n- From flat to nested `{location: {street, city}, postal: {zipCode, country}}`\n\n**Frontend Impact:**\n- **yashmahalwal/fark-frontend-demo**: `src/api/rest.ts` - Create requests will fail with HTTP 400 (high)\n- **yashmahalwal/fark-mobile-demo**: `app/src/main/java/com/fark/mobiledemo/api/rest/RestApi.kt` - Flat map will be rejected (HTTP 400) (high)\n- **yashmahalwal/fark-mobile-demo**: `app/src/main/java/com/fark/mobiledemo/api/rest/RestApiClient.kt` - Requests fail until updated (high)",
//     },
//     {
//       path: "src/rest/routes.ts",
//       line: 301,
//       startLine: 301,
//       endLine: 350,
//       side: "RIGHT",
//       startSide: "RIGHT",
//       body: "⚠️ **Breaking API Change**\n\nREST PUT `/orders/:id` requires `shippingAddress.location` and `postal`.\n\n**Technical Details:**\n- Previously optional, now required\n\n**Frontend Impact:**\n- No frontend impacts detected",
//     },
//     {
//       path: "src/rest/routes.ts",
//       line: 351,
//       startLine: 351,
//       endLine: 400,
//       side: "RIGHT",
//       startSide: "RIGHT",
//       body: "⚠️ **Breaking API Change**\n\nREST PUT `/orders/:id` request body `shippingAddress` structure changed.\n\n**Technical Details:**\n- From flat to `{location: {street, city}, postal: {zipCode, country}}`\n\n**Frontend Impact:**\n- **yashmahalwal/fark-mobile-demo**: `src/api/rest.ts` - Update requests will fail (HTTP 400) (high)\n- **yashmahalwal/fark-mobile-demo**: `app/src/main/java/com/fark/mobiledemo/api/rest/RestApiClient.kt` - Requests fail until updated (high)",
//     },
//   ],
// };

/**
 * Orchestrates the complete Fark.ai workflow:
 * 1. Analyzes backend PR for API breaking changes
 * 2. Finds frontend impacts for each frontend repo
 * 3. Generates PR comments with impacts and fixes
 */
export async function runFarkAnalysis(
  input: OrchestrateInput
): Promise<OrchestrateOutput> {
  // Validate input
  const validatedInput = orchestrateInputSchema.parse(input);

  const {
    backend,
    frontendRepos,
    beGithubToken,
    frontendGithubToken,
    mcpServerUrl,
    openaiApiKey,
    logLevel,
    beAnalyzerOptions,
    frontendFinderOptions,
  } = validatedInput;

  const logger = pino({
    level: logLevel,
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  });

  logger.info(
    {
      backend: `${backend.owner}/${backend.repo}`,
      pull_number: backend.pull_number,
      frontendReposCount: frontendRepos.length,
      logLevel,
    },
    "Starting Fark.ai analysis workflow"
  );

  logger.info(
    `Analyzing backend PR #${backend.pull_number} in ${backend.owner}/${backend.repo}`
  );
  logger.debug(`Frontend repos to analyze: ${frontendRepos.length}`);

  // Step 1: Initialize backend tools
  logger.debug("Initializing backend GitHub tools");
  const { tools: backendTools } = await getBackendTools(
    beGithubToken,
    mcpServerUrl
  );
  logger.debug(
    `Backend tools initialized: ${Object.keys(backendTools).length} tools available`
  );

  // Step 2: Run Agent 1 - BE Diff Analyzer
  logger.info("Step 1: Analyzing backend diff for API breaking changes");
  const backendChangesResult = await analyzeBackendDiff(
    { backend },
    backendTools,
    openaiApiKey,
    logger,
    beAnalyzerOptions
  );
  logger.info(
    `Backend analysis complete: ${backendChangesResult.backendChanges.length} breaking changes detected`
  );

  // Step 3: Early exit if no backend changes
  if (backendChangesResult.backendChanges.length === 0) {
    logger.info("No API breaking changes detected, exiting early");
    return {
      changes: [],
      prComments: {
        comments: [],
        summary: "No API breaking changes detected in this PR.",
      },
    };
  }

  // Step 4: Run Agent 2 - Frontend Impact Finder for each frontend repo
  logger.info(
    `Step 2: Analyzing ${frontendRepos.length} frontend repository/repositories for impacts`
  );

  const allFrontendImpacts: z.infer<typeof frontendImpactItemSchema>[] = [];

  logger.debug(`Initializing frontend github tools `);
  const { tools: frontendTools } = await getFrontendTools(
    frontendGithubToken,
    mcpServerUrl
  );

  for (const frontendRepo of frontendRepos) {
    const repoId = `${frontendRepo.owner}/${frontendRepo.repo}`;

    try {
      // Ensure branch has a default value if not provided
      const frontendRepoWithBranch = {
        ...frontendRepo,
        branch: frontendRepo.branch || "main",
      };

      logger.info(
        {
          owner: frontendRepoWithBranch.owner,
          repo: frontendRepoWithBranch.repo,
          branch: frontendRepoWithBranch.branch,
        },
        `Analyzing frontend repo: ${frontendRepoWithBranch.owner}/${frontendRepoWithBranch.repo} (branch: ${frontendRepoWithBranch.branch})`
      );

      const frontendImpactsResult = await findFrontendImpacts(
        {
          frontendRepo: frontendRepoWithBranch,
          backendChanges: backendChangesResult as any, // Test data - cast to avoid type errors
        },
        frontendTools,
        openaiApiKey,
        logger,
        frontendFinderOptions
      );

      logger.info(
        { repoId, impactCount: frontendImpactsResult.frontendImpacts.length },
        `Frontend analysis for ${repoId} complete: ${frontendImpactsResult.frontendImpacts.length} impacts found`
      );

      // Impacts already include frontendRepo as a string (format "owner/repo:branch") from the agent
      // No need to override - agent already provides the correct format
      allFrontendImpacts.push(...frontendImpactsResult.frontendImpacts);
    } catch (error) {
      logger.error(
        {
          repoId,
          error: error instanceof Error ? error.message : String(error),
        },
        `Failed to analyze frontend repo ${repoId}:`
      );
    }
  }

  logger.info(
    { totalImpacts: allFrontendImpacts.length },
    `Frontend analysis complete: ${allFrontendImpacts.length} total impacts across all repos`
  );

  // Step 5: Group frontend impacts by backend change ID (optimized)
  // Create a Map for O(1) lookups instead of O(n) filter for each backend change
  const impactsByBackendChangeId = new Map<
    string,
    z.infer<typeof frontendImpactItemSchema>[]
  >();

  // Initialize map with empty arrays for all backend changes
  backendChangesResult.backendChanges.forEach((backendChange) => {
    impactsByBackendChangeId.set(backendChange.id, []);
  });

  // Group impacts by backend change ID in a single pass
  allFrontendImpacts.forEach((impact) => {
    const impacts = impactsByBackendChangeId.get(impact.backendChangeId);
    if (impacts) {
      impacts.push(impact);
    } else {
      logger.warn(
        {
          impact,
          backendChangeIds: backendChangesResult.backendChanges.map(
            (c) => c.id
          ),
        },
        `Frontend impact ${impact.apiElement} references unknown backend change ID: ${impact.backendChangeId}`
      );
    }
  });

  // Map backend changes with their grouped impacts
  const changesWithImpacts = (backendChangesResult.backendChanges as any[]).map(
    (backendChange) => ({
      ...backendChange,
      frontendImpacts: impactsByBackendChangeId.get(backendChange.id) || [],
    })
  ) as z.infer<typeof backendChangeWithImpactsSchema>[];


  // Step 6: Run Agent 3 - PR Comment Generator (generates comments, doesn't post)
  logger.info("Step 3: Generating PR comments");
  const prComments = await generatePRComments(
    {
      changes: changesWithImpacts,
      backend_owner: backend.owner,
      backend_repo: backend.repo,
      pull_number: backend.pull_number,
    },
    {}, // No tools needed - just generates comments
    openaiApiKey,
    logger
  );


  // Step 7: Run Agent 4 - PR Comment Poster (posts comments to PR)
  logger.info("Step 4: Posting PR comments");
  logger.debug(
    {
      commentCount: prComments.comments.length,
      summaryLength: prComments.summary.length,
    },
    "PR Comment Poster: Input prepared"
  );
  const postResult = await postPRComments(
    {
      comments: prComments,
      backend_owner: backend.owner,
      backend_repo: backend.repo,
      pull_number: backend.pull_number,
    },
    backendTools,
    openaiApiKey,
    logger
  );

  logger.info(
    {
      success: postResult.success,
      reviewId: postResult.reviewId,
    },
    `PR Comment Poster: ${postResult.success ? "Success" : "Failed"} - ${postResult.message}`
  );

  logger.info("Fark.ai analysis workflow completed successfully");
  return {
    changes: changesWithImpacts,
    prComments,
  };
}
