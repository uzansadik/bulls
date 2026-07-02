/**
 * @openbulls/ai — public barrel.
 *
 * Faz 4 surface. Each helper carries both a `type` (compile-time)
 * and a `const` (runtime) export under the same identifier. The
 * barrel separates the two with `export type { ... }` and
 * `export { ... }` blocks so downstream consumers can pick
 * whichever fits.
 */

// Errors
export type { AiErrorCode } from "./domain/errors";
export {
  ModelUnavailableError,
  ToolExecutionFailedError,
  ToolNotFoundError,
  PromptRenderError,
} from "./domain/errors";

// Model
export type {
  ModelCapability,
  ModelDescriptor,
  ModelKeyBranded,
  ModelProvider,
} from "./domain/model/model-descriptor";
export {
  modelCapabilitySchema,
  ModelDescriptor as ModelDescriptorHelper,
  modelDescriptorSchema,
  modelProviderSchema,
} from "./domain/model/model-descriptor";
export type { Markup, ModelPricing, UsdPer1M } from "./domain/model/model-pricing";
export {
  ModelPricing as ModelPricingHelper,
  modelPricingSchema,
  usdPer1MSchema,
} from "./domain/model/model-pricing";

// Tool
export type { AnyToolSpec, ToolContext, ToolSpec } from "./domain/tool/tool-spec";
export { ToolSpec as ToolSpecHelper } from "./domain/tool/tool-spec";
export type { ToolPermission } from "./domain/tool/tool-permission";
export {
  ToolPermission as ToolPermissionHelper,
  toolPermissionSchema,
} from "./domain/tool/tool-permission";

// Prompt
export type { PromptTemplate, RenderOptions } from "./domain/prompt/prompt-template";
export { PromptTemplate as PromptTemplateHelper } from "./domain/prompt/prompt-template";

// Memory
export type {
  ConversationMemoryConfig,
  ConversationWindow,
  MemoryMessage,
  MemoryRole,
  MemoryToolInvocation,
} from "./domain/memory/conversation-memory";
export {
  ConversationMemory,
  DEFAULT_CONVERSATION_MEMORY,
} from "./domain/memory/conversation-memory";

// Gateway
export type {
  VercelAiGatewayClient,
  CreateVercelAiGatewayClientOptions,
} from "./infrastructure/gateway/vercel-ai-gateway.client";
export { createVercelAiGatewayClient } from "./infrastructure/gateway/vercel-ai-gateway.client";
export type { CreateAiSdkModelOptions } from "./infrastructure/gateway/ai-sdk-model.factory";
export { createAiSdkModel } from "./infrastructure/gateway/ai-sdk-model.factory";
export type { CreateLangChainModelOptions } from "./infrastructure/gateway/langchain-model.factory";
export { createLangChainModel } from "./infrastructure/gateway/langchain-model.factory";

// Application queries
export type { ListAvailableModelsOptions } from "./application/list-available-models.query";
export {
  defaultModelRegistry,
  listAvailableModels,
} from "./application/list-available-models.query";
export type { ResolveModelOptions } from "./application/resolve-model.query";
export { resolveModel } from "./application/resolve-model.query";

// Application — tool registry + selector
export type { ToolRegistry } from "./application/tool-registry.service";
export {
  buildToolRegistry,
  createToolRegistry,
  DynamicStructuredTool,
} from "./application/tool-registry.service";
export type { Intent } from "./application/tool-selector.service";
export {
  detectIntents,
  selectToolNames,
  selectTools,
} from "./application/tool-selector.service";
export type { DefaultToolRegistryDeps } from "./application/default-tool-registry.factory";
export { createDefaultToolRegistry } from "./application/default-tool-registry.factory";

// Infrastructure — tool factories
export {
  makeAddTransactionTool,
  makeGetPortfolioOverviewTool,
  makeGetPositionsTool,
  makeCalculatePortfolioHealthTool,
  makePortfolioTools,
} from "./infrastructure/tools/portfolio-tools";
export {
  makeGetDelayedPriceTool,
  makeGetPriceHistoryTool,
  makeGetFxRateTool,
  makeGetTechnicalIndicatorsTool,
  makeGetFinancialRatiosTool,
  makeSearchMarketNewsTool,
  makeMarketDataTools,
} from "./infrastructure/tools/market-data-tools";
export {
  makeGetFinancialStatementTool,
  makeGetIncomeStatementTool,
  makeGetBalanceSheetTool,
  makeGetCashFlowTool,
  makeAnalyzeFinancialStatementTool,
  makeFinancialsTools,
} from "./infrastructure/tools/financials-tools";
export {
  makeCreateScheduledJobTool,
  makePauseScheduledJobTool,
  makeListScheduledJobsTool,
  makeAutomationTools,
} from "./infrastructure/tools/automation-tools";
