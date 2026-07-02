/**
 * @openbulls/ai — direct AI SDK model factory.
 *
 * Used when we want to skip the Gateway and address a provider
 * directly (e.g. for tests, internal tooling, or when a model is
 * not yet available on the Gateway). Each provider package exports
 * a function that turns a model id into a Vercel AI SDK
 * `LanguageModel` instance.
 *
 * We do not pick a provider package at runtime — that decision is
 * baked into `ModelDescriptor.provider` so the application layer
 * can route without knowing about provider existence.
 */
import { anthropic as createAnthropicProvider } from "@ai-sdk/anthropic";
import { google as createGoogleProvider } from "@ai-sdk/google";
import { openai as createOpenAiProvider } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

import { ModelUnavailableError } from "../../domain/errors";
import type { ModelDescriptor } from "../../domain/model/model-descriptor";

export interface CreateAiSdkModelOptions {
  /** The descriptor telling us *which* model and *which* provider. */
  readonly descriptor: ModelDescriptor;
  /** Provider API key. Read from env at boot. */
  readonly apiKey: string;
}

/**
 * Build a `LanguageModel` directly from a provider. Throws when
 * the descriptor's provider is the Gateway (use the Gateway client
 * for that path) or when the model is unavailable.
 */
export function createAiSdkModel(options: CreateAiSdkModelOptions): LanguageModel {
  if (options.descriptor.provider === "vercel-ai-gateway") {
    throw new ModelUnavailableError(
      "createAiSdkModel is for direct-provider models; use the Vercel AI Gateway client for gateway-routed calls",
      options.descriptor.key,
    );
  }
  if (!options.apiKey || options.apiKey.length === 0) {
    throw new ModelUnavailableError(
      `provider ${options.descriptor.provider} requires a non-empty apiKey`,
      options.descriptor.key,
    );
  }

  // Set the provider-specific env var the SDK reads by default, then
  // restore afterwards so unrelated code paths aren't affected.
  switch (options.descriptor.provider) {
    case "anthropic": {
      const previous = process.env.ANTHROPIC_API_KEY;
      process.env.ANTHROPIC_API_KEY = options.apiKey;
      const model = createAnthropicProvider(options.descriptor.key);
      if (previous === undefined) process.env.ANTHROPIC_API_KEY = undefined;
      else process.env.ANTHROPIC_API_KEY = previous;
      return model;
    }
    case "openai": {
      const previous = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = options.apiKey;
      const model = createOpenAiProvider(options.descriptor.key);
      if (previous === undefined) process.env.OPENAI_API_KEY = undefined;
      else process.env.OPENAI_API_KEY = previous;
      return model;
    }
    case "google": {
      const previous = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = options.apiKey;
      const model = createGoogleProvider(options.descriptor.key);
      if (previous === undefined) process.env.GOOGLE_GENERATIVE_AI_API_KEY = undefined;
      else process.env.GOOGLE_GENERATIVE_AI_API_KEY = previous;
      return model;
    }
    default: {
      // Exhaustiveness check — `vercel-ai-gateway` is handled above.
      const _exhaustive: never = options.descriptor.provider;
      throw new ModelUnavailableError(
        `unsupported provider: ${String(_exhaustive)}`,
        options.descriptor.key,
      );
    }
  }
}
