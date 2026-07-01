import { and, asc, desc, eq, gt, isNull, lte, or } from "drizzle-orm";

import type { DatabaseOrTx } from "../client";
import { modelPricing } from "../schema/billing.schema";
import type { IPricingCatalog } from "./pricing.port";

/**
 * Pricing catalog. The `model_pricing` table is time-versioned
 * (effective_from / effective_to); `getActiveForModel` returns the
 * newest row whose window covers `asOf`. When no rows match it
 * returns `null` and the caller decides between `PricingNotFoundError`
 * or a free-tier fallback.
 */
export class DrizzlePricingRepository implements IPricingCatalog {
  constructor(private readonly db: DatabaseOrTx) {}

  async getActiveForModel(modelKey: string, asOf = new Date()) {
    const rows = await this.db
      .select()
      .from(modelPricing)
      .where(
        and(
          eq(modelPricing.modelKey, modelKey),
          lte(modelPricing.effectiveFrom, asOf),
          or(isNull(modelPricing.effectiveTo), gt(modelPricing.effectiveTo, asOf)),
        ),
      )
      .orderBy(desc(modelPricing.effectiveFrom))
      .limit(1);
    return rows[0] ?? null;
  }

  listActive() {
    return this.db
      .select()
      .from(modelPricing)
      .where(
        and(
          lte(modelPricing.effectiveFrom, new Date()),
          or(isNull(modelPricing.effectiveTo), gt(modelPricing.effectiveTo, new Date())),
        ),
      )
      .orderBy(asc(modelPricing.modelKey));
  }
}
