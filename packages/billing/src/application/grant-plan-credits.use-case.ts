/**
 * Grant a plan's monthly credits to a user.
 *
 * Called by:
 *   - Subscription creation flow (initial grant).
 *   - Cron job that grants renewals (`apps/cron`).
 *   - Admin manual grants.
 *
 * Atomic flow: balance snapshot → ledger append with positive delta.
 */
import { type DB, withTransaction } from "@openbulls/db/client";
import { type Result, err, ok } from "@openbulls/shared";

import { credits } from "../domain/credits";
import { PlanNotFoundError } from "../domain/errors";
import type { ILedgerRepository } from "../domain/ports/ledger.port";
import type { IPlanRepository } from "../domain/ports/plan.port";
import type { IWalletRepository } from "../domain/ports/wallet.port";

export interface GrantPlanCreditsDeps {
  db: DB;
  plans: IPlanRepository;
  ledger: ILedgerRepository;
  wallet: IWalletRepository;
}

export interface GrantPlanCreditsInput {
  userId: string;
  planCode: string;
  notes?: string;
}

export type GrantPlanCreditsResult = Result<
  { txId: string; balanceAfter: string; granted: string },
  PlanNotFoundError
>;

export async function grantPlanCredits(
  deps: GrantPlanCreditsDeps,
  input: GrantPlanCreditsInput,
): Promise<GrantPlanCreditsResult> {
  const plan = await deps.plans.getByCode(input.planCode);
  if (!plan) {
    return err(new PlanNotFoundError(input.planCode));
  }
  return withTransaction(async (tx) => {
    const balance = await deps.wallet.getBalance(input.userId, tx);
    const newBalance = credits.add(balance, plan.monthlyCredits);

    const ledger = await deps.ledger.append(
      {
        userId: input.userId,
        planId: plan.id,
        delta: plan.monthlyCredits,
        balanceAfter: newBalance,
        kind: "grant",
        referenceType: "plan",
        referenceId: plan.code,
        notes: input.notes ?? null,
      },
      tx,
    );

    return ok({
      txId: ledger.id,
      balanceAfter: newBalance,
      granted: plan.monthlyCredits,
    });
  });
}
