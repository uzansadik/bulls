import type { ModelPricing } from "../schema/billing.schema";

/**
 * Pricing source — `model_pricing` rows effective at a given moment.
 *
 * `getActiveForModel` returns the most-recently-effective row whose
 * `effective_from <= asOf` and `effective_to IS NULL OR effective_to > asOf`.
 * When no rows match (or the model is unknown) it returns `null` and
 * the caller surfaces `PricingNotFoundError`.
 */
export interface IPricingCatalog {
  getActiveForModel(modelKey: string, asOf?: Date): Promise<ModelPricing | null>;
  listActive(): Promise<ModelPricing[]>;
}
