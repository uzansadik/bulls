/**
 * apps/web — client-side chat hook.
 *
 * Minimal streaming chat state holder:
 *   - POSTs the latest user message + session id + model key to
 *     `/api/chat`.
 *   - Reads the response stream as `data:` chunks (AI SDK v7's
 *     UIMessage stream wire format).
 *   - Accumulates text deltas into the current assistant message
 *     so the UI can render partial responses.
 *
 * Why not `@ai-sdk/react`:
 *   - The peer dep matrix between `ai@7` (used by `@openbulls/ai`
 *     and our `/api/chat` route) and `@ai-sdk/react` resolves to a
 *     conflicting `ai@5` instance. Faz 5+ picks a stable combo
 *     (either downgrade `ai` or wait for `@ai-sdk/react@3`). For
 *     Faz 4 we wire the stream ourselves — small enough that a
 *     hand-rolled parser is the lesser evil.
 */
"use client";

import { useCallback, useState } from "react";

import type { ChatMessage, ChatSession } from "../schemas/chat-session.schema";

export interface UseChatModelOptions {
  readonly session: ChatSession;
  readonly locale?: string;
}

export interface UseChatModelReturn {
  readonly messages: ReadonlyArray<ChatMessage>;
  readonly input: string;
  readonly setInput: (next: string) => void;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly stop: () => void;
  readonly submit: (text: string) => Promise<void>;
  readonly reload: () => Promise<void>;
}

/**
 * Parse one AI SDK v7 UIMessage stream chunk. Returns the text delta
 * when the chunk is a "text-delta" event; `null` for any other chunk.
 *
 * Wire format (v7):
 *   data: {"type":"text-start","id":"..."}\n\n
 *   data: {"type":"text-delta","id":"...","delta":"Hello"}\n\n
 *   data: {"type":"text-end","id":"..."}\n\n
 *   data: {"type":"finish-step",...}\n\n
 *   data: {"type":"finish",...}\n\n
 */
function parseChunk(raw: string): { textDelta: string; done: boolean } | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  let payload: { type?: string; delta?: string; finishReason?: string };
  try {
    payload = JSON.parse(trimmed) as { type?: string; delta?: string; finishReason?: string };
  } catch {
    return null;
  }
  if (payload.type === "text-delta" && typeof payload.delta === "string") {
    return { textDelta: payload.delta, done: false };
  }
  if (payload.type === "finish" || payload.finishReason === "stop") {
    return { textDelta: "", done: true };
  }
  return null;
}

function genId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function useChatModel(options: UseChatModelOptions): UseChatModelReturn {
  const [messages, setMessages] = useState<ReadonlyArray<ChatMessage>>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);

  const locale = options.locale ?? "tr";

  const stop = useCallback(() => {
    controller?.abort();
    setController(null);
    setIsLoading(false);
  }, [controller]);

  const submit = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0 || isLoading) return;
      setError(null);
      setInput("");

      const userMsg: ChatMessage = {
        id: genId(),
        role: "user",
        content: trimmed,
        toolCalls: null,
        createdAt: new Date().toISOString(),
      };
      const assistantId = genId();
      const assistantPlaceholder: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        toolCalls: null,
        createdAt: new Date().toISOString(),
      };
      const next = [...messages, userMsg, assistantPlaceholder];
      setMessages(next);
      setIsLoading(true);

      const ac = new AbortController();
      setController(ac);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionId: options.session.id,
            modelKey: options.session.modelKey ?? undefined,
            locale,
            messages: next.map((m) => ({ role: m.role, content: m.content })),
          }),
          signal: ac.signal,
        });
        if (!res.ok || !res.body) {
          throw new Error(`chat request failed: ${res.status}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let acc = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // Split on the data: prefix + double newline boundary.
          let idx = buffer.indexOf("\n\n");
          while (idx !== -1) {
            const block = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const line = block.startsWith("data: ") ? block.slice(6) : block;
            const parsed = parseChunk(line);
            if (parsed?.textDelta) {
              acc += parsed.textDelta;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)),
              );
            }
            idx = buffer.indexOf("\n\n");
          }
        }
      } catch (err) {
        if ((err as { name?: string }).name !== "AbortError") {
          setError(String((err as Error).message ?? err));
        }
        // Drop the placeholder message on error so the user sees a clean state.
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        setIsLoading(false);
        setController(null);
      }
    },
    [isLoading, locale, messages, options.session.id, options.session.modelKey],
  );

  const reload = useCallback(async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) await submit(lastUser.content);
  }, [messages, submit]);

  return { messages, input, setInput, isLoading, error, stop, submit, reload };
}
