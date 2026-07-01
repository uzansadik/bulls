/**
 * Error taxonomy helpers.
 *
 * Verifies `isFatal`, `isUserFacing`, `isRetryable` route each
 * `PortfolioError` subclass to the right category.
 */
import { describe, expect, it } from "vitest";
import { TransactionSide, PortfolioId } from "@__tests__/aliases";
import { AssetSymbol } from "@__tests__/aliases";
import {
  ArchivedPortfolioError,
  DuplicateTransactionError,
  HoldingNotFoundError,
  InvalidInputError,
  InvalidTransactionError,
  PortfolioNotFoundError,
  RepositoryError,
  TransactionNotFoundError,
  isFatal,
  isRetryable,
  isUserFacing,
} from "./errors";

describe("PortfolioError helpers", () => {
  it("isFatal: true for not-found / archived / mismatch / holding errors", () => {
    expect(
      isFatal(
        new PortfolioNotFoundError({ portfolioId: PortfolioId("p1") }),
      ),
    ).toBe(true);
    expect(
      isFatal(
        new ArchivedPortfolioError({ portfolioId: PortfolioId("p1") }),
      ),
    ).toBe(true);
    expect(isFatal(new InvalidTransactionError({ side: TransactionSide("buy"), reason: "x" }))).toBe(false);
    expect(isFatal(new RepositoryError({ operation: "x" }))).toBe(false);
  });

  it("isUserFacing: true for fatal + user-facing errors", () => {
    expect(
      isUserFacing(
        new TransactionNotFoundError({ transactionId: "t1" }),
      ),
    ).toBe(true);
    expect(
      isUserFacing(new DuplicateTransactionError({ transactionId: "t1" })),
    ).toBe(true);
    expect(isUserFacing(new RepositoryError({ operation: "x" }))).toBe(false);
  });

  it("isRetryable: true only for RepositoryError", () => {
    expect(isRetryable(new RepositoryError({ operation: "x" }))).toBe(true);
    expect(
      isRetryable(
        new HoldingNotFoundError({
          portfolioId: PortfolioId("p1"),
          assetSymbol: AssetSymbol("AAPL"),
        }),
      ),
    ).toBe(false);
  });

  it("InvalidInputError has user kind and stable code", () => {
    const e = new InvalidInputError({ field: "name", reason: "must not be empty" });
    expect(e.code).toBe("portfolio/invalid-input");
    expect(e.kind).toBe("user");
    expect(e.data).toEqual({ field: "name", reason: "must not be empty" });
  });
});