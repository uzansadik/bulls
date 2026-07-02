/**
 * @openbulls/ai — LangChain model factory.
 *
 * Builds a LangChain `BaseChatModel` for direct use by the agent
 * runtime's `call-model.node.ts`. Subgraph synthesis steps go
 * through LangChain (rather than the Vercel AI SDK) because
 * LangChain is already the runtime's abstraction layer for
 * tool calling + prompt templating — adding another model SDK
 * inside `packages/agent-runtime` would just duplicate the
 * integration surface.
 *
 * Each provider package exposes its own factory. We do *not*
 * support the Gateway here — subgraphs always reach a concrete
 * provider because the LangChain ChatModel interface does not
 * have a clean adapter for the Gateway's routed models.
 */
import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";

import { ModelUnavailableError } from "../../domain/errors";
import type { ModelDescriptor } from "../../domain/model/model-descriptor";

export interface CreateLangChainModelOptions {
  readonly descriptor: ModelDescriptor;
  readonly apiKey: string;
  /** Optional sampling params surfaced to the chat model. */
  readonly temperature?: number;
  readonly maxTokens?: number;
}

/**
 * Build a LangChain `BaseChatModel` from a descriptor. Throws when
 * the provider is the Gateway or unsupported.
 */
export function createLangChainModel(options: CreateLangChainModelOptions): BaseChatModel {
  if (options.descriptor.provider === "vercel-ai-gateway") {
    throw new ModelUnavailableError(
      "createLangChainModel is for direct-provider models; subgraphs must address providers directly",
      options.descriptor.key,
    );
  }
  if (!options.apiKey || options.apiKey.length === 0) {
    throw new ModelUnavailableError(
      `provider ${options.descriptor.provider} requires a non-empty apiKey`,
      options.descriptor.key,
    );
  }

  switch (options.descriptor.provider) {
    case "anthropic": {
      return new ChatAnthropic({
        apiKey: options.apiKey,
        model: options.descriptor.key,
        ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
        ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
      });
    }
    case "openai": {
      return new ChatOpenAI({
        apiKey: options.apiKey,
        modelName: options.descriptor.key,
        ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
        ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
      });
    }
    case "google": {
      return new ChatGoogleGenerativeAI({
        apiKey: options.apiKey,
        model: options.descriptor.key,
        ...(options.maxTokens !== undefined ? { maxOutputTokens: options.maxTokens } : {}),
      });
    }
    default: {
      const _exhaustive: never = options.descriptor.provider;
      throw new ModelUnavailableError(
        `unsupported provider: ${String(_exhaustive)}`,
        options.descriptor.key,
      );
    }
  }
}
