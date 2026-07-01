/**
 * @openbulls/billing — pricing math.
 *
 * Pure function: takes a pricing row + token counts, returns a
 * `PricingCalculation`. The caller (use case) is responsible for
 * fetching the relevant `model_pricing` row and persisting the
 * resulting `cost_amount` / `credits_charged` numbers.
 *
 * Markup is applied multiplicatively on top of base cost, e.g. an
 * effective 20% markup on a $1 call costs $1.20. This matches the
 * column definition (`markup_percent numeric(6,3)`) and existing
 * seeded values.
 */

export interface PricingCalculation {
  /** Base cost (USD or model-currency), pre-markup. */
  costAmount: string;
  /** Credit delta applied to the user (post-markup). */
  creditsCharged: string;
}

export interface PricingRow {
  inputCostPer1k: string;
  outputCostPer1k: string;
  markupPercent: string;
}

export interface PricingInput {
  modelPricing: PricingRow;
  inputTokens: number;
  outputTokens: number;
}

export function calculateUsageCost(input: PricingInput): PricingCalculation {
  const { modelPricing, inputTokens, outputTokens } = input;
  const inputCost = (inputTokens / 1000) * Number(modelPricing.inputCostPer1k);
  const outputCost = (outputTokens / 1000) * Number(modelPricing.outputCostPer1k);
  const baseCost = inputCost + outputCost;
  const markupMultiplier = 1 + Number(modelPricing.markupPercent) / 100;
  const charged = baseCost * markupMultiplier;
  return {
    costAmount: baseCost.toFixed(8),
    creditsCharged: charged.toFixed(8),
  };
}
