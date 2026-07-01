/**
 * Read the user's current credit balance.
 *
 * Balance is derived from `SUM(billing_credit_transactions.delta)`.
 * Currency is implicit — we record it per pricing row but the
 * ledger stores it as the local (USD) figure. Single-currency for
 * now; multi-currency would split into per-currency ledgers.
 */
import { type Result, ok } from "@openbulls/shared";

import type { BillingError } from "../domain/errors";
import type { IWalletRepository } from "../domain/ports/wallet.port";

export interface GetWalletBalanceDeps {
  wallet: IWalletRepository;
}

export interface GetWalletBalanceInput {
  userId: string;
}

export type GetWalletBalanceResult = Result<{ balance: string; currency: "USD" }, BillingError>;

export async function getWalletBalance(
  deps: GetWalletBalanceDeps,
  input: GetWalletBalanceInput,
): Promise<GetWalletBalanceResult> {
  const balance = await deps.wallet.getBalance(input.userId);
  return ok({ balance, currency: "USD" });
}
