/**
 * apps/web — chat streaming endpoint.
 *
 * POST `/api/chat` accepts `{ sessionId, messages, modelKey?, locale? }`
 * and streams a UIMessage-style response (text deltas + finish
 * marker) via the Vercel AI SDK v7 streamText pipeline.
 *
 * Wire format (text/event-stream):
 *   data: {"type":"text-delta","id":"...","delta":"Hello"}\n\n
 *   data: {"type":"text-end","id":"..."}\n\n
 *   data: {"type":"finish","finishReason":"stop"}\n\n
 *
 * The client-side `useChatModel` hook (apps/web/features/chat/hooks)
 * parses this format. We intentionally avoid `useChat` /
 * `@ai-sdk/react` for now — its peer dependency matrix clashes with
 * the `ai@7` ecosystem used by `@openbulls/ai` and the route.
 */
import { createAiSdkModel, defaultModelRegistry, resolveModel } from "@openbulls/ai";
import { serverEnv } from "@openbulls/config";
import { type LanguageModelUsage, type UIMessage, convertToModelMessages, streamText } from "ai";

import { saveChatMessage } from "@/features/chat/actions/save-chat-message.action";
import { getChatToolBundle } from "@/lib/ai/tool-registry";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ChatRequestBody {
  readonly sessionId: string;
  readonly messages: ReadonlyArray<{ role: string; content: string }>;
  readonly modelKey?: string;
  readonly locale?: string;
}

const DEFAULT_MODEL_KEY = "claude-sonnet-4-6";

function financeSystemPrompt(localeHint: string): string {
  return [
    "You are Openbulls Assistant, a finance-aware chat helper.",
    `Reply in ${localeHint}.`,
    "Use the tools when the user asks about live prices, FX, news, or their portfolio.",
    "Format answers in markdown with code blocks for figures.",
    "If a tool returns an error, surface it briefly and ask the user to retry.",
  ].join(" ");
}

/**
 * Resolve `AI_GATEWAY_API_KEY` for any provider; fall back to the
 * provider-specific key when the Gateway isn't configured. The
 * Gateway primary, provider-direct secondary — keeps the chat alive
 * even on a fresh dev box.
 */
function apiKeyForProvider(
  env: ReturnType<typeof serverEnv>,
  provider: string,
): string | undefined {
  if (env.AI_GATEWAY_API_KEY) return env.AI_GATEWAY_API_KEY;
  switch (provider) {
    case "anthropic":
      return env.ANTHROPIC_API_KEY;
    case "openai":
      return env.OPENAI_API_KEY;
    case "google":
      return env.GOOGLE_GENERATIVE_AI_API_KEY;
    default:
      return undefined;
  }
}

export async function POST(req: Request): Promise<Response> {
  // 1) Auth — anonymous callers get a 401 instead of an open pipe.
  const user = await getSessionUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  // 2) Body validation.
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return new Response("invalid body", { status: 400 });
  }
  const { sessionId, messages } = body;
  const requestedKey = body.modelKey ?? DEFAULT_MODEL_KEY;
  const locale = body.locale ?? "tr";
  if (!sessionId || !Array.isArray(messages) || messages.length === 0) {
    return new Response("missing sessionId/messages", { status: 400 });
  }

  try {
    resolveModel(requestedKey);
  } catch {
    return new Response(`unknown model: ${requestedKey}`, { status: 400 });
  }

  // 3) Resolve provider → model.
  const env = serverEnv();
  const descriptor = resolveModel(requestedKey, { registry: defaultModelRegistry });
  const apiKey = apiKeyForProvider(env, descriptor.provider);
  if (!apiKey) {
    return new Response("no API key configured for model provider", { status: 503 });
  }
  const model = createAiSdkModel({
    descriptor,
    apiKey,
  });

  // 4) Tools — default registry, bound to Vercel AI SDK shape.
  const { bindForVercelAiSdk } = getChatToolBundle();
  const tools = bindForVercelAiSdk();

  // 5) Build the UIMessage[] the SDK understands. Our wire format
  //    is `{role, content}` so the mapping is trivial.
  const uiMessages: UIMessage[] = messages.map((m) => ({
    id: crypto.randomUUID(),
    role: m.role as UIMessage["role"],
    parts: [{ type: "text", text: m.content }],
  }));

  // 6) Run the stream.
  //
  //    `tools` is typed as `Record<string, unknown>` by our registry
  //    — the AI SDK wants a `ToolSet`, which is a structurally
  //    compatible record of `Tool` instances. The `as never` keeps
  //    the call site terse; the runtime contract is unchanged.
  const result = streamText({
    model,
    system: financeSystemPrompt(locale),
    messages: convertToModelMessages(uiMessages) as never,
    ...(Object.keys(tools).length > 0 ? { tools: tools as never } : {}),
    abortSignal: req.signal,
    onFinish: async ({ text, usage }: { text: string; usage: LanguageModelUsage }) => {
      // 7) Persist the final assistant message. `saveChatMessage`
      //    verifies ownership; failures are swallowed because the
      //    user already sees the streamed reply.
      await saveChatMessage({
        sessionId,
        role: "assistant",
        content: text,
      }).catch(() => undefined);
      // `usage` lands in `ai_usage_events` once the runtime wires
      // the recorder (Faz 5); meanwhile we just keep the values
      // available for future telemetry work.
      void usage;
    },
  });

  return result.toUIMessageStreamResponse();
}
