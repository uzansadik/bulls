/**
 * @openbulls/ai — domain: model pricing.
 *
 * Pricing is expressed as USD per million tokens for input and
 * output. Markup is a percentage applied on top of the provider's
 * list price (it pays for the AI Gateway routing, retries, and the
 * product margin).
 *
 * Cost is computed as `tokens / 1_000_000 * pricePer1M * (1 + markup)`.
 * We return `string` (USD with 8 decimals) so the value can flow
 * straight into a Drizzle `numeric(20, 8)` column without lossy
 * rounding through `number`.
 *
 * Pricing for specific models is *not* hardcoded here — it will be
 * loaded from the `model_pricing` table in Faz 5. This file ships
 * the *type* and the arithmetic helpers so the rest of the package
 * can depend on a stable contract.
 */
import { z } from "zod";

/** Positive finite USD per 1 000 000 tokens. */
export const usdPer1MSchema = z.number().finite().nonnegative();
export type UsdPer1M = z.infer<typeof usdPer1MSchema>;

/** Markup percentage as a fraction, e.g. `0.20` for +20 %. */
export const markupSchema = z.number().finite().min(0);
export type Markup = z.infer<typeof markupSchema>;

export const modelPricingSchema = z.object({
  inputUsdPer1M: usdPer1MSchema,
  outputUsdPer1M: usdPer1MSchema,
  /** Fraction (e.g. `0.20` = +20 %). */
  markupPct: markupSchema,
  /** ISO-4217 currency code; defaults to `"USD"`. */
  currency: z.string().length(3).default("USD"),
});
export type ModelPricing = z.infer<typeof modelPricingSchema>;

export const ModelPricing = {
  of(input: ModelPricing): ModelPricing {
    return input;
  },
  parse(input: unknown): ModelPricing {
    return modelPricingSchema.parse(input);
  },
  /**
   * Cost for `tokens` billed at `usdPer1M` with `markup` applied.
   * Returns a numeric string with 8 decimals (Drizzle-friendly).
   *
   *   tokens = 1_000, usdPer1M = 3, markup = 0.20
   *     ⇒ 1000/1e6 * 3 * 1.20 = 0.0036 ⇒ "0.00360000"
   */
  costUsd(tokens: number, usdPer1M: UsdPer1M, markup: Markup): string {
    if (tokens < 0) {
      throw new RangeError(`tokens must be non-negative, got ${tokens}`);
    }
    const usd = (tokens / 1_000_000) * usdPer1M * (1 + markup);
    return usd.toFixed(8);
  },
  /**
   * Combined input + output cost. Same string contract as `costUsd`.
   */
  totalCostUsd(pricing: ModelPricing, promptTokens: number, completionTokens: number): string {
    const input = ModelPricing.costUsd(promptTokens, pricing.inputUsdPer1M, pricing.markupPct);
    const output = ModelPricing.costUsd(
      completionTokens,
      pricing.outputUsdPer1M,
      pricing.markupPct,
    );
    return (
      BigInt(Math.round(Number.parseFloat(input) * 1e8)) +
      BigInt(Math.round(Number.parseFloat(output) * 1e8))
    )
      .toString()
      .padStart(1, "0")
      .replace(/^(\d+)$/, (digits) => {
        const whole = digits.slice(0, -8) || "0";
        const frac = digits.slice(-8).padStart(8, "0");
        return `${whole}.${frac}`;
      });
  },
} as const;
