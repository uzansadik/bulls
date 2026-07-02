/**
 * @openbulls/ai — domain: conversation memory.
 *
 * Slim, deterministic sliding window over the most recent messages
 * + tool invocations. The point is not to be clever — it's to give
 * every model call a bounded, predictable amount of context so we
 * don't blow past the model's `contextWindow` silently.
 *
 * Why a domain primitive and not an application service?
 *   - It's a pure function over the state shape; no I/O.
 *   - The `packages/agent-runtime` subgraph nodes also want to
 *     compact their `messages` stream before model invocation —
 *     keeping this in `domain/` lets both call sites share.
 *
 * Persisted memory (user profile, investment preferences) lives in
 * `infrastructure/memory/` and arrives in Faz 5. This file only
 * handles the ephemeral in-run history.
 *
 * `MemoryMessage` and `MemoryToolInvocation` mirror the agent-runtime
 * shape but live here to avoid a circular `packages/ai` →
 * `packages/agent-runtime` dependency. The runtime adapts to these
 * types at the gateway boundary.
 */
export type MemoryRole = "system" | "user" | "assistant";

export interface MemoryMessage {
  readonly role: MemoryRole;
  readonly content: string;
  /** Optional name (e.g. tool name for assistant tool messages). */
  readonly name?: string;
}

export interface MemoryToolInvocation {
  readonly toolName: string;
  readonly args: unknown;
  readonly result: unknown;
}

export interface ConversationMemoryConfig {
  /** Max number of messages kept (default 20). */
  readonly maxMessages: number;
  /**
   * Soft cap on the cumulative character count. Messages whose
   * cumulative length would exceed this are dropped from the tail.
   * Default 12 000 — leaves headroom for the system prompt on a
   * 16 k-token model.
   */
  readonly maxChars: number;
}

export const DEFAULT_CONVERSATION_MEMORY: ConversationMemoryConfig = {
  maxMessages: 20,
  maxChars: 12_000,
};

export interface ConversationWindow {
  readonly messages: ReadonlyArray<MemoryMessage>;
  readonly toolInvocations: ReadonlyArray<MemoryToolInvocation>;
  readonly truncated: boolean;
}

export const ConversationMemory = {
  /**
   * Build a sliding-window snapshot from the full message + tool
   * streams. The returned arrays are the *most recent* N entries.
   *
   * Order: messages are kept in chronological order; the oldest
   * dropped entries never appear in the result.
   */
  window(
    messages: ReadonlyArray<MemoryMessage>,
    toolInvocations: ReadonlyArray<MemoryToolInvocation>,
    config: ConversationMemoryConfig = DEFAULT_CONVERSATION_MEMORY,
  ): ConversationWindow {
    const sliced = messages.slice(-config.maxMessages);
    const toolSlice = toolInvocations.slice(-config.maxMessages);
    const truncated = sliced.length < messages.length;
    const charCount = sliced.reduce((n, m) => n + m.content.length, 0);
    if (charCount <= config.maxChars) {
      return { messages: sliced, toolInvocations: toolSlice, truncated };
    }
    // Char-budget overflow: walk from the end and drop until we fit.
    const fitted: MemoryMessage[] = [];
    let total = 0;
    for (let i = sliced.length - 1; i >= 0; i--) {
      const msg = sliced[i];
      if (!msg) continue;
      const len = msg.content.length;
      if (total + len > config.maxChars && fitted.length > 0) {
        break;
      }
      fitted.unshift(msg);
      total += len;
    }
    return {
      messages: fitted,
      toolInvocations: toolSlice,
      truncated: true,
    };
  },
} as const;
