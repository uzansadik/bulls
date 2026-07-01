import { asc, eq } from "drizzle-orm";

import type { DatabaseOrTx } from "../client";
import { plans } from "../schema/billing.schema";
import type { IPlanRepository } from "./plan.port";

/**
 * Plan catalog. Plans are seeded at deploy time and rarely changed;
 * we keep the surface narrow.
 */
export class DrizzlePlanRepository implements IPlanRepository {
  constructor(private readonly db: DatabaseOrTx) {}

  listActive() {
    return this.db
      .select()
      .from(plans)
      .where(eq(plans.isActive, true))
      .orderBy(asc(plans.pricePerMonthCents));
  }

  getById(id: string) {
    return this.db.query.plans.findFirst({ where: eq(plans.id, id) }).then((r) => r ?? null);
  }

  getByCode(code: string) {
    return this.db.query.plans.findFirst({ where: eq(plans.code, code) }).then((r) => r ?? null);
  }
}
