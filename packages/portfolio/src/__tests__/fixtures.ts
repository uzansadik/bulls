/**
 * Test fixtures: small helpers to build Transaction VOs with
 * sensible defaults. Tests don't go through the DB layer — they
 * exercise pure functions with in-memory data.
 */
import type { TransactionSide, Currency, Money } from "../domain/brands";
import { AssetSymbol } from "../domain/symbol";
import type { Transaction } from "../domain/transaction";

export interface MakeTxInput {
  readonly id?: string;
  readonly side?: TransactionSide | string;
  readonly symbol?: string;
  readonly quantity?: string;
  readonly unitPrice?: string;
  readonly fees?: string;
  readonly currency?: string;
  readonly executedAt?: Date;
  readonly notes?: string | null;
}

export function makeTx(input: MakeTxInput = {}): Transaction {
  let n = 0;
  // simple counter so default ids are unique per test
  const id = input.id ?? `tx-${++n}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    portfolioId: "portfolio-1",
    assetSymbol: AssetSymbol(input.symbol ?? "AAPL"),
    side: (input.side ?? "buy") as TransactionSide,
    quantity: (input.quantity ?? "10") as Money,
    unitPrice: (input.unitPrice ?? "100") as Money,
    fees: (input.fees ?? "0") as Money,
    currency: (input.currency ?? "USD") as Currency,
    executedAt: input.executedAt ?? new Date("2026-01-15T10:00:00Z"),
    notes: input.notes ?? null,
  };
}