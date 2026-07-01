import type { DatabaseOrTx } from "../client";

/**
 * Wallet balance projection over the credit ledger.
 *
 * The implementation is a single `SUM(delta)` aggregate over
 * `billing_credit_transactions` for the given user. Reservations do not
 * yet deduct balance (only `finalization` does), so `getBalance` returns
 * the user's available credit at call time.
 *
 * `tx?` is supported for atomic balance checks inside use-case
 * transactions (e.g. reserve-credits reads balance, then inserts a
 * reservation row, both inside one DB transaction).
 */
export interface IWalletRepository {
  /**
   * Sum of all `billing_credit_transactions.delta` for the user.
   * Returned as a numeric-string with 8 decimal places (e.g.
   * `"12.50000000"`). Returns `"0"` when no rows exist.
   */
  getBalance(userId: string, tx?: DatabaseOrTx): Promise<string>;
}
