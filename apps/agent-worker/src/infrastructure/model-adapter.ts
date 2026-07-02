/**
 * apps/agent-worker — model gateway adapter.
 *
 * Bridges `@openbulls/ai` (model descriptors + LangChain factories)
 * to the narrow `IModelGateway` port the agent-runtime speaks.
 *
 * The runtime expects two methods (`invoke`, `stream`). Subgraph
 * synthesis nodes call `invoke`; the streaming path is reserved
 * for the future Deep Analysis stream (apps/web pulls the events
 * via the agent-worker job output stream — see Faz 8).
 *
 * Why LangChain (not Vercel AI SDK) here:
 *   - The runtime already depends on `@langchain/core` +
 *     `@langchain/langgraph`. Adding Vercel AI SDK would force
 *     another provider abstraction on top of the same surface.
 *   - Subgraph synthesis steps are single-turn (system + one user
 *     message → text). Vercel AI SDK's tool-binding glue is
 *     overkill for the synthesis path; apps/web uses it for the
 *     interactive chat surface instead.
 *
 * Why per-provider key lookup:
 *   - `resolveModel` returns a `ModelDescriptor` with a provider
 *     tag (`anthropic` | `openai` | `google`). The adapter maps
 *     that tag to the matching env var via `ServerEnv`.
 *   - Vercel AI Gateway is intentionally unsupported here — the
 *     factory throws on Gateway providers, and the runtime never
 *     routes subgraphs through the Gateway (CLAUDE.md §10: tool
 *     bindings live in apps/web).
 */
import type {
  IModelGateway,
  ModelInvocationRequest,
  ModelInvocationResult,
  ModelStreamChunk,
} from "@openbulls/agent-runtime";
import { ModelUnavailableError, createLangChainModel, resolveModel } from "@openbulls/ai";
import type { ServerEnv } from "@openbulls/config";
import { type LoggerLike, noopLogger } from "@openbulls/logger";

/**
 * Concrete LangChain chat-model type — pulled transitively through
 * `@openbulls/ai` so we don't import the provider-specific
 * `@langchain/core` sub-path directly. The runtime stays decoupled
 * from whichever LangChain major is currently installed.
 */
type LangChainChatModel = ReturnType<typeof createLangChainModel>;

/**
 * Inputs for the adapter factory.
 */
export interface CreateModelAdapterOptions {
  readonly env: ServerEnv;
  readonly logger?: LoggerLike;
}

/**
 * Resolve the API key for a given provider descriptor. Throws when
 * the matching env var is missing so misconfiguration is caught at
 * adapter construction (and therefore at worker boot), not when a
 * subgraph fires.
 */
function apiKeyForProvider(env: ServerEnv, provider: string): string {
  switch (provider) {
    case "anthropic": {
      if (!env.ANTHROPIC_API_KEY) {
        throw new ModelUnavailableError(
          "ANTHROPIC_API_KEY missing from env",
          "anthropic-unconfigured",
        );
      }
      return env.ANTHROPIC_API_KEY;
    }
    case "openai": {
      if (!env.OPENAI_API_KEY) {
        throw new ModelUnavailableError("OPENAI_API_KEY missing from env", "openai-unconfigured");
      }
      return env.OPENAI_API_KEY;
    }
    case "google": {
      if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new ModelUnavailableError(
          "GOOGLE_GENERATIVE_AI_API_KEY missing from env",
          "google-unconfigured",
        );
      }
      return env.GOOGLE_GENERATIVE_AI_API_KEY;
    }
    default: {
      throw new ModelUnavailableError(
        `unsupported provider for runtime gateway: ${provider}`,
        provider,
      );
    }
  }
}

/**
 * Convert the runtime's `messages` shape into a list of `{role,
 * content}` pairs that match LangChain's `BaseMessageLike` shape.
 *
 * We do the mapping structurally (a plain object) and let the
 * LangChain chat model narrow the role at call time. This keeps the
 * adapter decoupled from any specific `@langchain/core` version's
 * `BaseMessage` class hierarchy.
 */
function toMessagesLike(
  req: ModelInvocationRequest,
): Array<{ readonly role: string; readonly content: string }> {
  const out: Array<{ readonly role: string; readonly content: string }> = [];
  if (req.systemPrompt && req.systemPrompt.length > 0) {
    out.push({ role: "system", content: req.systemPrompt });
  }
  for (const m of req.messages) {
    out.push({ role: m.role, content: m.content });
  }
  return out;
}

/**
 * Read token usage off a LangChain `AIMessage`-shaped result.
 *
 * LangChain v1 exposes `usage_metadata` with `input_tokens`,
 * `output_tokens`, `total_tokens`. Older providers may not populate
 * it; we coerce missing fields to 0 rather than throwing so the
 * billing finalize-usage node always has something to record.
 */
function readUsage(result: unknown): ModelInvocationResult["usage"] {
  const candidate = result as {
    usage_metadata?: {
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
    };
  };
  const meta = candidate.usage_metadata ?? {};
  const promptTokens = typeof meta.input_tokens === "number" ? meta.input_tokens : 0;
  const completionTokens = typeof meta.output_tokens === "number" ? meta.output_tokens : 0;
  const totalTokens =
    typeof meta.total_tokens === "number" ? meta.total_tokens : promptTokens + completionTokens;
  return { promptTokens, completionTokens, totalTokens };
}

/**
 * Read content off a LangChain result. `content` may be a string
 * (most providers) or an array of content blocks (v1 multi-modal).
 * For Faz 4 subgraphs we always want a string; arrays get joined
 * with double newlines so reasoning + text blocks survive the
 * round-trip.
 */
function readContent(result: unknown): string {
  const candidate = result as { content?: unknown };
  const content = candidate.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (block && typeof block === "object" && "text" in block) {
          const text = (block as { text?: unknown }).text;
          if (typeof text === "string") return text;
        }
        return "";
      })
      .filter((s) => s.length > 0)
      .join("\n\n");
  }
  return "";
}

/**
 * Build an `IModelGateway` backed by LangChain chat models.
 *
 * The adapter is stateless — every call constructs a fresh
 * `BaseChatModel` via `createLangChainModel`. That keeps the
 * surface narrow and lets the LangChain factories handle per-key
 * rotation without the adapter needing its own cache.
 */
export function createModelAdapter(options: CreateModelAdapterOptions): IModelGateway {
  const logger = options.logger ?? noopLogger;

  const buildModel = (req: ModelInvocationRequest): LangChainChatModel => {
    const descriptor = resolveModel(req.modelKey);
    const apiKey = apiKeyForProvider(options.env, descriptor.provider);
    return createLangChainModel({
      descriptor,
      apiKey,
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
      ...(req.maxTokens !== undefined ? { maxTokens: req.maxTokens } : {}),
    });
  };

  return {
    async invoke(req: ModelInvocationRequest): Promise<ModelInvocationResult> {
      const model = buildModel(req);
      const messages = toMessagesLike(req);
      logger.info("model-adapter.invoke", {
        modelKey: req.modelKey,
        messageCount: messages.length,
      });
      // `as never` is intentional: the LangChain `BaseMessage` type
      // varies across major versions and we want to keep the adapter
      // pinned to whatever `@openbulls/ai` resolves at install time.
      const result = await (model.invoke as (m: unknown) => Promise<unknown>)(messages as never);
      const content = readContent(result);
      const usage = readUsage(result);
      // Tool calls are reserved for the chat surface (apps/web) — the
      // synthesis path never emits them. We return an empty array
      // so the finalize-usage node stays generic.
      return { content, usage, toolCalls: [] };
    },

    stream(req: ModelInvocationRequest): AsyncIterable<ModelStreamChunk> {
      // Reserved for the future Deep Analysis stream. For now we
      // collapse the stream into a single "text" + "done" pair so
      // callers can wire the surface without a second port.
      const model = buildModel(req);
      const messages = toMessagesLike(req);
      async function* gen(): AsyncGenerator<ModelStreamChunk> {
        logger.info("model-adapter.stream", {
          modelKey: req.modelKey,
          messageCount: messages.length,
        });
        const stream = await (model.stream as (m: unknown) => Promise<AsyncIterable<unknown>>)(
          messages as never,
        );
        for await (const chunk of stream) {
          const text = readContent(chunk);
          if (text.length > 0) {
            yield { event: "text", data: text };
          }
        }
        yield { event: "done", data: null };
      }
      return gen();
    },
  };
}
