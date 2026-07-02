/**
 * @openbulls/agent-runtime — model gateway port.
 *
 * Subgraphs need to call a model (Claude / GPT / Gemini / ...) for
 * the synthesis step that turns raw research into a markdown report.
 * The runtime never imports a concrete provider SDK directly — that
 * would couple it to `@langchain/anthropic` / `@langchain/openai` /
 * `@ai-sdk/gateway` and break the rule "agent-runtime owns graph
 * orchestration, packages/ai owns model access" (CLAUDE.md §9 + §8).
 *
 * The gateway port is intentionally minimal. Two methods cover the
 * two ways a subgraph uses a model:
 *
 *   - `invoke()` — non-streaming, returns the final text + usage.
 *                  Used by synthesis nodes that just need the
 *                  composed answer (e.g. `synthesize-company-analysis`,
 *                  `summarize-market-news`).
 *   - `stream()` — async-iterable of chunks. Wired up for the agent
 *                  UI; Faz 4 keeps the streaming path opt-in (the
 *                  streaming chat surface lives in apps/web, not the
 *                  worker). The runtime exposes it so the future
 *                  "Deep analysis" stream can drop in without a
 *                  second port.
 *
 * The actual implementation lives in
 * `apps/agent-worker/src/infrastructure/model-adapter.ts` and
 * delegates to `@openbulls/ai`'s `createLangChainModel` factory.
 *
 * Why `unknown` for messages / tool calls instead of a branded type:
 *   - The runtime never reads the structured payload of a tool call
 *     or model message — it just hands it through to the model.
 *   - Keeping the port generic lets callers (subgraphs, chat, the
 *     future Telegram bot) share one model gateway implementation.
 */
export interface ModelInvocationRequest {
  /** Final system prompt injected verbatim. */
  readonly systemPrompt: string;
  /** Conversation messages, oldest first. */
  readonly messages: ReadonlyArray<{
    readonly role: "system" | "user" | "assistant";
    readonly content: string;
  }>;
  /** Optional tool definitions; the model may emit tool calls. */
  readonly tools?: ReadonlyArray<{
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
  }>;
  /** Model key — resolved against `packages/ai` model registry. */
  readonly modelKey: string;
  /** Optional sampling controls. */
  readonly temperature?: number;
  readonly maxTokens?: number;
}

export interface ModelInvocationResult {
  /** Final assistant text. */
  readonly content: string;
  /** Token accounting consumed by the finalize-usage node. */
  readonly usage: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  /** Any tool calls the model chose to emit (already executed by the gateway). */
  readonly toolCalls: ReadonlyArray<{
    readonly name: string;
    readonly args: unknown;
    readonly result: unknown;
  }>;
}

export interface ModelStreamChunk {
  readonly event: "text" | "tool-call" | "done";
  readonly data: unknown;
}

export interface IModelGateway {
  /**
   * Run a non-streaming completion. Throws when the model key is
   * not registered or when the upstream provider errors — callers
   * wrap the call in a billing-aware node so a thrown error still
   * releases any reserved credit.
   */
  invoke(req: ModelInvocationRequest): Promise<ModelInvocationResult>;

  /**
   * Streaming variant. Emits ordered chunks until the model signals
   * completion with an event="done" chunk. The runtime surface is
   * intentionally narrow so a future Vercel AI SDK or HTTP-only
   * gateway can plug in without changing the runtime.
   */
  stream(req: ModelInvocationRequest): AsyncIterable<ModelStreamChunk>;
}
