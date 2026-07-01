/**
 * @openbulls/portfolio — error taxonomy.
 *
 * Mirrors @openbulls/market-data `domain/errors.ts`. Every
 * application command / query returns `Result<T, PortfolioError>`,
 * and consumers pattern-match on the subclass to decide whether to
 * retry (`isRetryable`) or surface the error (`isFatal` /
 * `isUserFacing`).
 *
 * Subclasses:
 *
 *   - `PortfolioNotFoundError`     — portfolioId doesn't exist
 *   - `TransactionNotFoundError`   — transactionId doesn't exist
 *   - `HoldingNotFoundError`       — (portfolio, asset) has no holding
 *   - `InvalidTransactionError`    — e.g. sell quantity > holding qty
 *   - `DuplicateTransactionError`  — insert collides on unique key
 *   - `CurrencyMismatchError`      — txn/holding currency inconsistent
 *   - `ArchivedPortfolioError`     — mutating an archived portfolio
 *   - `RepositoryError`            — Drizzle / I/O failure (retryable)
 *
 * `isFatal` → user must fix (validation, conflict, not-found).
 * `isUserFacing` → safe to display in UI without redaction.
 * `isRetryable` → transient infrastructure issue.
 */
import { AppError } from "@openbulls/shared";
import type { AssetSymbol } from "./symbol";
import type { PortfolioId, TransactionSide } from "./brands";

export abstract class PortfolioError extends AppError {
  public abstract readonly kind: "fatal" | "user" | "retryable" | "internal";
}

// ── Fatal ─────────────────────────────────────────────────────────

export class PortfolioNotFoundError extends PortfolioError {
  public readonly code = "portfolio/not-found";
  public readonly kind = "fatal" as const;
  public readonly data: { readonly portfolioId: PortfolioId; readonly provider?: never };
  public constructor(input: { portfolioId: PortfolioId }) {
    super(`Portfolio ${input.portfolioId} not found`);
    this.data = { portfolioId: input.portfolioId };
  }
}

export class TransactionNotFoundError extends PortfolioError {
  public readonly code = "portfolio/transaction-not-found";
  public readonly kind = "fatal" as const;
  public readonly data: { readonly transactionId: string; readonly provider?: never };
  public constructor(input: { transactionId: string }) {
    super(`Transaction ${input.transactionId} not found`);
    this.data = { transactionId: input.transactionId };
  }
}

export class HoldingNotFoundError extends PortfolioError {
  public readonly code = "portfolio/holding-not-found";
  public readonly kind = "fatal" as const;
  public readonly data: {
    readonly portfolioId: PortfolioId;
    readonly assetSymbol: AssetSymbol;
    readonly provider?: never;
  };
  public constructor(input: { portfolioId: PortfolioId; assetSymbol: AssetSymbol }) {
    super(`Holding for ${input.assetSymbol} in portfolio ${input.portfolioId} not found`);
    this.data = { portfolioId: input.portfolioId, assetSymbol: input.assetSymbol };
  }
}

export class ArchivedPortfolioError extends PortfolioError {
  public readonly code = "portfolio/archived";
  public readonly kind = "fatal" as const;
  public readonly data: { readonly portfolioId: PortfolioId; readonly provider?: never };
  public constructor(input: { portfolioId: PortfolioId }) {
    super(`Portfolio ${input.portfolioId} is archived; read-only`);
    this.data = { portfolioId: input.portfolioId };
  }
}

export class CurrencyMismatchError extends PortfolioError {
  public readonly code = "portfolio/currency-mismatch";
  public readonly kind = "fatal" as const;
  public readonly data: {
    readonly expected: string;
    readonly actual: string;
    readonly provider?: never;
  };
  public constructor(input: { expected: string; actual: string; side?: TransactionSide }) {
    const where = input.side ? ` for ${input.side}` : "";
    super(
      `Currency mismatch${where}: expected ${input.expected}, got ${input.actual}`,
    );
    this.data = { expected: input.expected, actual: input.actual };
  }
}

// ── User-facing validation ────────────────────────────────────────

export class InvalidTransactionError extends PortfolioError {
  public readonly code = "portfolio/invalid-transaction";
  public readonly kind = "user" as const;
  public readonly data: {
    readonly side: TransactionSide;
    readonly reason: string;
    readonly provider?: never;
  };
  public constructor(input: { side: TransactionSide; reason: string }) {
    super(`Invalid ${input.side} transaction: ${input.reason}`);
    this.data = { side: input.side, reason: input.reason };
  }
}

export class DuplicateTransactionError extends PortfolioError {
  public readonly code = "portfolio/duplicate-transaction";
  public readonly kind = "user" as const;
  public readonly data: { readonly transactionId: string; readonly provider?: never };
  public constructor(input: { transactionId: string }) {
    super(`Transaction ${input.transactionId} already exists`);
    this.data = { transactionId: input.transactionId };
  }
}

// ── Retryable ─────────────────────────────────────────────────────

export class RepositoryError extends PortfolioError {
  public readonly code = "portfolio/repository-error";
  public readonly kind = "retryable" as const;
  public readonly data: {
    readonly operation: string;
    readonly cause?: unknown;
    readonly provider?: never;
  };
  public constructor(input: { operation: string; cause?: unknown; message?: string }) {
    super(input.message ?? `Repository ${input.operation} failed`);
    this.data = {
      operation: input.operation,
      ...(input.cause !== undefined ? { cause: input.cause } : {}),
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

export function isFatal(e: PortfolioError): boolean {
  return e.kind === "fatal";
}

export function isUserFacing(e: PortfolioError): boolean {
  return e.kind === "fatal" || e.kind === "user";
}

export function isRetryable(e: PortfolioError): boolean {
  return e.kind === "retryable";
}