/**
 * List active plans for the public pricing page.
 */
import { type Result, ok } from "@openbulls/shared";

import type { Plan } from "@openbulls/db/schema";
import type { BillingError } from "../domain/errors";
import type { IPlanRepository } from "../domain/ports/plan.port";

export interface ListPlansDeps {
  plans: IPlanRepository;
}

export type ListPlansResult = Result<Plan[], BillingError>;

export async function listPlans(deps: ListPlansDeps): Promise<ListPlansResult> {
  const plans = await deps.plans.listActive();
  return ok(plans);
}
