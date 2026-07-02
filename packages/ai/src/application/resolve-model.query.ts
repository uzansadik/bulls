import { ModelUnavailableError } from "../domain/errors";
/**
 * @openbulls/ai — application: resolve a model key to a descriptor.
 *
 * Looks up `ModelKey` in the hardcoded registry and returns the
 * matching `ModelDescriptor`. Throws `ModelUnavailableError` when
 * the key is unknown — callers should treat that as a 400-class
 * failure (user picked a retired model).
 *
 * Pricing is NOT attached here; it lives in the `model_pricing`
 * table and will be joined in Faz 5. The runtime doesn't need it
 * to make a model call.
 */
import type { ModelDescriptor } from "../domain/model/model-descriptor";
import { defaultModelRegistry } from "./list-available-models.query";

export interface ResolveModelOptions {
  /**
   * Override the registry — tests use this to inject a smaller
   * fixture set.
   */
  readonly registry?: ReadonlyArray<ModelDescriptor>;
}

export function resolveModel(modelKey: string, options: ResolveModelOptions = {}): ModelDescriptor {
  const registry = options.registry ?? defaultModelRegistry;
  const found = registry.find((d) => d.key === modelKey);
  if (!found) {
    throw new ModelUnavailableError(`model key not registered: ${modelKey}`, modelKey);
  }
  return found;
}
