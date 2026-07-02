/**
 * @openbulls/portfolio — branded (nominal) primitives.
 *
 * Smart constructors are identity casts. Validation lives at the
 * boundary (Drizzle row mapping, repository ports, application
 * commands) — see [[domain.errors]] for the error taxonomy.
 *
 * Conventions follow @openbulls/market-data `brands.ts` and
 * @openbulls/shared `branded.ts`.
 */
import type { TransactionSide as DbTransactionSide } from "@openbulls/db/schema";
import type { Brand } from "@openbulls/shared";

// ── PortfolioId ───────────────────────────────────────────────────
// Natural primary key (`portfolios.id`). UUID v4 string.
export type PortfolioId = Brand<string, "PortfolioId">;
export const PortfolioId = (s: string): PortfolioId => s as PortfolioId;

// ── UserId ────────────────────────────────────────────────────────
// Identifies the owner. Mirrors `users.id` from auth schema.
export type UserId = Brand<string, "UserId">;
export const UserId = (s: string): UserId => s as UserId;

// ── TransactionSide ───────────────────────────────────────────────
// Branded `transactionSideEnum` value. Smart constructor accepts
// any string so test fixtures can pass arbitrary tags; production
// callers pass `DbTransactionSide` literals.
export type TransactionSide = Brand<DbTransactionSide, "TransactionSide">;
export const TransactionSide = (s: string): TransactionSide => s as TransactionSide;

// ── Money ─────────────────────────────────────────────────────────
// `numeric(20, 8)` Drizzle string. Identifies an amount with up to
// 8 decimal places of precision. Pure metadata; no validation
// enforced here (repos + commands validate on insert).
export type Money = Brand<string, "Money">;
export const Money = (s: string): Money => s as Money;

// ── Currency ──────────────────────────────────────────────────────
// ISO 4217 currency code (TRY, USD, EUR, ...). Mirrors
// market-data `Currency` brand but kept separate so the portfolio
// package does not depend on `@openbulls/market-data`.
export type Currency = Brand<string, "Currency">;
export const Currency = (s: string): Currency => s as Currency;