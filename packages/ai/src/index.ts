/**
 * @openbulls/ai — public barrel.
 *
 * Faz 4 foundation: the domain types every other layer (gateway,
 * tools, prompts, telemetry) depends on. Application + infrastructure
 * layers will be exported in later commits as they land.
 *
 * Each helper carries both a `type` (compile-time) and a `const`
 * (runtime) export under the same identifier. The barrel separates
 * the two with `export type { ... }` and `export { ... }` blocks so
 * downstream consumers can pick whichever fits.
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
