import { eq } from "drizzle-orm";

import { type DB, withTransaction } from "../client";
import { portfolioHoldings, portfolioTransactions, portfolios } from "../schema/portfolio.schema";
import type {
  AddTransactionInput,
  CreatePortfolioInput,
  IPortfolioRepository,
} from "./portfolio.port";

export class DrizzlePortfolioRepository implements IPortfolioRepository {
  constructor(private readonly db: DB) {}

  async create(input: CreatePortfolioInput) {
    const rows = await this.db
      .insert(portfolios)
      .values({
        userId: input.userId,
        name: input.name,
        baseCurrency: input.baseCurrency,
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("failed to insert portfolios row");
    return row;
  }

  async listByUser(userId: string) {
    return this.db.query.portfolios.findMany({
      where: eq(portfolios.userId, userId),
    });
  }

  getById(id: string) {
    return this.db.query.portfolios
      .findFirst({ where: eq(portfolios.id, id) })
      .then((r) => r ?? null);
  }

  async recordTransaction(input: AddTransactionInput) {
    return withTransaction(async (tx) => {
      const txRows = await tx
        .insert(portfolioTransactions)
        .values({
          portfolioId: input.portfolioId,
          assetSymbol: input.assetSymbol,
          side: input.side,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          fees: input.fees ?? "0",
          currency: input.currency,
          executedAt: input.executedAt,
          notes: input.notes ?? null,
        })
        .returning();
      const txRow = txRows[0];
      if (!txRow) {
        throw new Error("failed to insert portfolio_transactions row");
      }

      // Upsert holding row — naive recompute, real cost basis lives in
      // a domain service (packages/portfolio) that wraps this repo.
      await tx
        .insert(portfolioHoldings)
        .values({
          portfolioId: input.portfolioId,
          assetSymbol: input.assetSymbol,
          quantity: input.quantity,
          avgCost: input.unitPrice,
          realizedPnl: "0",
        })
        .onConflictDoUpdate({
          target: [portfolioHoldings.portfolioId, portfolioHoldings.assetSymbol],
          set: {
            quantity: input.quantity,
            avgCost: input.unitPrice,
            lastComputedAt: new Date(),
          },
        });

      return txRow;
    });
  }

  async recomputeHoldings(portfolioId: string) {
    // Recompute delegates to the portfolio package; this method is a
    // placeholder kept as a port contract. Implementation will call a
    // domain service that aggregates transactions.
    return this.getHoldings(portfolioId);
  }

  getHoldings(portfolioId: string) {
    return this.db.query.portfolioHoldings.findMany({
      where: eq(portfolioHoldings.portfolioId, portfolioId),
    });
  }
}
