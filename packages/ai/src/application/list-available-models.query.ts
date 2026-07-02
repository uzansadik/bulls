/**
 * @openbulls/ai — application: list available models.
 *
 * Hardcoded registry of model descriptors for the Vercel AI Gateway
 * + direct providers. Faz 5 will replace this with a DB-backed
 * lookup against the `model_pricing` table; the contract here stays
 * the same so consumers don't need to change.
 *
 * Each descriptor includes the provider enum + display name +
 * context window + capabilities. The pricing record is intentionally
 * NOT part of this list — pricing lives in `model_pricing` and will
 * be fetched separately by `resolve-model` once DB-backed.
 */
import type { ModelDescriptor } from "../domain/model/model-descriptor";

/**
 * Default registry. Add a model here when it lands in production;
 * nothing else needs to change.
 */
const DEFAULT_REGISTRY: ReadonlyArray<ModelDescriptor> = [
  {
    key: "claude-fable-5",
    provider: "vercel-ai-gateway",
    displayName: "Claude Fable 5",
    contextWindow: 200_000,
    capabilities: ["text", "tool-use", "vision", "streaming"],
    maxOutputTokens: 16_000,
  },
  {
    key: "claude-opus-4-8",
    provider: "vercel-ai-gateway",
    displayName: "Claude Opus 4.8",
    contextWindow: 200_000,
    capabilities: ["text", "tool-use", "vision", "streaming"],
    maxOutputTokens: 16_000,
  },
  {
    key: "claude-sonnet-4-6",
    provider: "vercel-ai-gateway",
    displayName: "Claude Sonnet 4.6",
    contextWindow: 200_000,
    capabilities: ["text", "tool-use", "vision", "streaming"],
    maxOutputTokens: 16_000,
  },
  {
    key: "claude-haiku-4-5-20251001",
    provider: "vercel-ai-gateway",
    displayName: "Claude Haiku 4.5",
    contextWindow: 200_000,
    capabilities: ["text", "tool-use", "streaming"],
    maxOutputTokens: 8_000,
  },
  {
    key: "gpt-4o",
    provider: "vercel-ai-gateway",
    displayName: "GPT-4o",
    contextWindow: 128_000,
    capabilities: ["text", "tool-use", "vision", "streaming"],
    maxOutputTokens: 16_000,
  },
  {
    key: "gemini-2.5-pro",
    provider: "vercel-ai-gateway",
    displayName: "Gemini 2.5 Pro",
    contextWindow: 1_000_000,
    capabilities: ["text", "tool-use", "vision", "streaming"],
    maxOutputTokens: 64_000,
  },
];

export interface ListAvailableModelsOptions {
  /**
   * Override the default registry (tests). Pass a custom list to
   * exercise specific subsets without touching the global one.
   */
  readonly registry?: ReadonlyArray<ModelDescriptor>;
}

/**
 * Return all models the system is willing to serve. The list is
 * sorted by display name for stable UI rendering.
 */
export function listAvailableModels(
  options: ListAvailableModelsOptions = {},
): ReadonlyArray<ModelDescriptor> {
  const source = options.registry ?? DEFAULT_REGISTRY;
  return [...source].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Internal: direct access to the default registry. Exposed for
 * `resolveModel` so both queries share one source of truth.
 */
export const defaultModelRegistry = DEFAULT_REGISTRY;
