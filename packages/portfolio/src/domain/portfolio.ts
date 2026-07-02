/**
 * @openbulls/portfolio — Portfolio aggregate root VO.
 *
 * Pure shape — no behavior. The aggregate's invariants (user owns
 * exactly one default portfolio per baseCurrency, archived portfolios
 * are read-only, etc.) are enforced in application commands.
 *
 * Stored in `portfolios` table (see `packages/db/src/schema/portfolio.schema.ts`).
 */
import type { PortfolioId, UserId, Currency } from "./brands";

export interface Portfolio {
  readonly id: PortfolioId;
  readonly userId: UserId;
  readonly name: string;
  readonly baseCurrency: Currency;
  readonly isArchived: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}