import { eq, sql } from "drizzle-orm";

import type { DatabaseOrTx } from "../client";
import { billingCreditTransactions } from "../schema/billing.schema";
import type { IWalletRepository } from "./wallet.port";

/**
 * Wallet balance projection. Balance is derived — we never persist a
 * "balance" column. The implementation runs a single `SUM(delta)`
 * aggregate over `billing_credit_transactions`. Inside a transaction
 * (`tx` provided) the aggregate sees the writes-in-progress, which is
 * what makes atomic `balance-check → reservation insert → ledger
 * append` flows correct.
 *
 * The `COALESCE(..., 0)::numeric(20,8)` cast keeps the return type
 * stable: a user with no ledger rows returns `"0.00000000"` rather
 * than `null`.
 */
export class DrizzleWalletRepository implements IWalletRepository {
  constructor(private readonly db: DatabaseOrTx) {}

  async getBalance(userId: string, tx?: DatabaseOrTx): Promise<string> {
    const conn = tx ?? this.db;
    const result = await conn
      .select({
        total: sql<string>`COALESCE(SUM(${billingCreditTransactions.delta}), 0)::numeric(20,8)`,
      })
      .from(billingCreditTransactions)
      .where(eq(billingCreditTransactions.userId, userId));
    return result[0]?.total ?? "0.00000000";
  }
}
