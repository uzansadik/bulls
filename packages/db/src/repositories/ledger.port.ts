import type { DatabaseOrTx } from "../client";
import type { BillingCreditTransaction, CreditTxKind } from "../schema/billing.schema";

/**
 * Ledger entry input. Numeric amounts are strings (numeric(20,8)
 * column — never serialize through JS Number).
 *
 * `balanceAfter` is the user's available credit balance AFTER the
 * delta is applied. The caller (use case) computes this from
 * `IWalletRepository.getBalance(userId, tx) + delta`.
 */
export interface AppendLedgerInput {
  userId: string;
  reservationId?: string | null;
  planId?: string | null;
  delta: string;
  balanceAfter: string;
  kind: CreditTxKind;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
}

/**
 * Append-only ledger for credit balance changes. The
 * `billing_credit_transactions` table is the source of truth — wallet
 * balance is `SUM(delta) WHERE user_id = ?` aggregated at read time.
 *
 * All methods accept an optional `tx` for atomic multi-step writes
 * orchestrated by use cases.
 */
export interface ILedgerRepository {
  append(input: AppendLedgerInput, tx?: DatabaseOrTx): Promise<BillingCreditTransaction>;
  listByUser(userId: string, limit?: number): Promise<BillingCreditTransaction[]>;
  listByReservation(reservationId: string): Promise<BillingCreditTransaction[]>;
}

export type {
  BillingCreditTransaction,
  CreditTxKind,
} from "../schema/billing.schema";
