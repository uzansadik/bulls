/**
 * @openbulls/ai — Vercel AI Gateway client.
 *
 * Thin wrapper over the Vercel AI SDK `gateway` provider. The
 * gateway handles provider fallback, observability, and request
 * routing; we just resolve a model key + api key into a usable
 * language model and wrap `streamText` / `generateText`.
 *
 * Two reasons this file is its own factory instead of a thin
 * re-export of `ai/gateway`:
 *
 *   1. Future flexibility — if we ever swap gateways (e.g. an
 *      internal gateway), we change one import line, not every
 *      call site.
 *   2. Centralised key handling — the api key is read once from
 *      the environment at boot; misconfiguration throws at startup
 *      rather than at the first user request.
 *
 * Direct-provider models are reached via the dedicated factories
 * (`ai-sdk-model.factory.ts`, `langchain-model.factory.ts`). The
 * Gateway path is the default for the chat surface; direct models
 * are reserved for tooling / tests / debug.
 *
 * AI SDK v7 note: `gateway` is exposed as a default `GatewayProvider`
 * callable (`gateway(modelId)`) plus `createGateway(options)` for
 * explicit configuration. We use `createGateway` so the api key is
 * passed in constructor form rather than via env mutation.
 */
import { createGateway } from "@ai-sdk/gateway";
import { generateText, streamText } from "ai";

import { ModelUnavailableError } from "../../domain/errors";
import type { ModelDescriptor } from "../../domain/model/model-descriptor";

export interface VercelAiGatewayClient {
  /**
   * Run a non-streaming completion. Returns the full response plus
   * usage metadata suitable for `record-usage` telemetry.
   */
  generateText(opts: {
    readonly model: ModelDescriptor;
    readonly system?: string;
    readonly messages: ReadonlyArray<{ role: "system" | "user" | "assistant"; content: string }>;
    readonly maxTokens?: number;
  }): Promise<{
    readonly content: string;
    readonly usage: {
      readonly promptTokens: number;
      readonly completionTokens: number;
      readonly totalTokens: number;
    };
  }>;
  /**
   * Run a streaming completion. `streamText` is the Vercel AI SDK
   * entry point that the `/api/chat` route consumes.
   */
  streamText(opts: {
    readonly model: ModelDescriptor;
    readonly system?: string;
    readonly messages: ReadonlyArray<{ role: "system" | "user" | "assistant"; content: string }>;
    readonly maxTokens?: number;
  }): ReturnType<typeof streamText>;
}

export interface CreateVercelAiGatewayClientOptions {
  /** Vercel AI Gateway API key. */
  readonly apiKey: string;
}

/**
 * Construct a Gateway client. Throws if the key is missing — we
 * intentionally do not default to an empty string so callers must
 * pass a real key from the boot sequence.
 */
export function createVercelAiGatewayClient(
  options: CreateVercelAiGatewayClientOptions,
): VercelAiGatewayClient {
  if (!options.apiKey || options.apiKey.length === 0) {
    throw new ModelUnavailableError(
      "vercel-ai-gateway client requires a non-empty apiKey",
      "vercel-ai-gateway",
    );
  }

  // AI SDK v7's `createGateway(options)` takes the api key as part
  // of the settings, so we no longer need to mutate process.env.
  const gateway = createGateway({ apiKey: options.apiKey });

  return {
    async generateText(opts) {
      const result = await generateText({
        model: gateway.languageModel(opts.model.key),
        ...(opts.system !== undefined ? { system: opts.system } : {}),
        messages: [...opts.messages],
        ...(opts.maxTokens !== undefined ? { maxTokens: opts.maxTokens } : {}),
      });
      const promptTokens = result.usage.inputTokens ?? 0;
      const completionTokens = result.usage.outputTokens ?? 0;
      return {
        content: result.text,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
      };
    },
    streamText(opts) {
      return streamText({
        model: gateway.languageModel(opts.model.key),
        ...(opts.system !== undefined ? { system: opts.system } : {}),
        messages: [...opts.messages],
        ...(opts.maxTokens !== undefined ? { maxTokens: opts.maxTokens } : {}),
      });
    },
  };
}
