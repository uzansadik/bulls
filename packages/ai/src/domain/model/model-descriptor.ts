/**
 * @openbulls/ai — domain: model descriptor.
 *
 * `ModelKey` (the branded identifier) lives in `@openbulls/shared`
 * because it is also referenced by billing, automation, and other
 * packages. The descriptor and provider metadata are AI-specific
 * — they describe what a model *is* and how to address it, not
 * which one to use.
 *
 * Conventions:
 *   - `key` is the canonical string Vercel AI Gateway / LangChain /
 *     direct providers all accept (e.g. `"claude-fable-5"`,
 *     `"gpt-4o"`, `"gemini-2.5-pro"`).
 *   - `provider` names a specific adapter that knows how to reach
 *     the model. `"vercel-ai-gateway"` routes through the Gateway;
 *     `"anthropic"`, `"openai"`, `"google"` reach the provider
 *     directly.
 *   - `contextWindow` is the max input tokens; we expose it so the
 *     tool selector can truncate long history before calling.
 *   - `capabilities` is a coarse set — fine-grained per-tool
 *     selection lives in the tool registry, not here.
 */
import { z } from "zod";

import type { ModelKey } from "@openbulls/shared";

export const modelProviderSchema = z.enum(["vercel-ai-gateway", "anthropic", "openai", "google"]);
export type ModelProvider = z.infer<typeof modelProviderSchema>;

export const modelCapabilitySchema = z.enum(["text", "tool-use", "vision", "streaming"]);
export type ModelCapability = z.infer<typeof modelCapabilitySchema>;

export const modelDescriptorSchema = z.object({
  key: z.string().min(1),
  provider: modelProviderSchema,
  displayName: z.string().min(1),
  contextWindow: z.number().int().positive(),
  capabilities: z.array(modelCapabilitySchema).min(1),
  /**
   * Recommended `maxTokens` cap for *single* model invocations.
   * Tool-using conversations may consume more across multiple steps.
   */
  maxOutputTokens: z.number().int().positive().optional(),
});
export type ModelDescriptor = z.infer<typeof modelDescriptorSchema>;

/**
 * Type-narrowed alias — the runtime value is the same string the
 * model descriptor carries, but at the type level we know it's a
 * branded `ModelKey`. Use this when crossing a boundary that
 * requires the brand (e.g. billing records, telemetry).
 */
export type ModelKeyBranded = ModelKey;

export const ModelDescriptor = {
  /**
   * Identity cast — does not validate. Use `modelDescriptorSchema.parse`
   * at the boundary (e.g. when reading from DB / config) and pass
   * the validated descriptor to the rest of the app.
   */
  of(input: ModelDescriptor): ModelDescriptor {
    return input;
  },
  /**
   * Parse an unknown payload (e.g. env var, DB row) into a descriptor.
   * Throws on shape mismatch.
   */
  parse(input: unknown): ModelDescriptor {
    return modelDescriptorSchema.parse(input);
  },
} as const;
