import type { Plan } from "../schema/billing.schema";

/**
 * Plan catalog. Read-only at runtime — new plans are seeded by an
 * admin script. `getByCode` is useful for webhook handlers that
 * receive Stripe/Iyzico price IDs and need to map back to a local
 * plan row.
 */
export interface IPlanRepository {
  listActive(): Promise<Plan[]>;
  getById(id: string): Promise<Plan | null>;
  getByCode(code: string): Promise<Plan | null>;
}
