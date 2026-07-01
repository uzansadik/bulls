import { ilike, sql } from "drizzle-orm";

import type { DB } from "../client";
import { marketAssets } from "../schema/market-assets.schema";
import type { IMarketAssetRepository, UpsertMarketAssetInput } from "./market-asset.port";

export class DrizzleMarketAssetRepository implements IMarketAssetRepository {
  constructor(private readonly db: DB) {}

  async upsert(input: UpsertMarketAssetInput) {
    const rows = await this.db
      .insert(marketAssets)
      .values({
        symbol: input.symbol,
        exchange: input.exchange ?? null,
        name: input.name,
        assetType: input.assetType,
        currency: input.currency,
        isin: input.isin ?? null,
        sector: input.sector ?? null,
        metadata: input.metadata ?? {},
      })
      .onConflictDoUpdate({
        target: marketAssets.symbol,
        set: {
          exchange: input.exchange ?? null,
          name: input.name,
          assetType: input.assetType,
          currency: input.currency,
          isin: input.isin ?? null,
          sector: input.sector ?? null,
          metadata: input.metadata ?? {},
          updatedAt: new Date(),
        },
      })
      .returning();
    const row = rows[0];
    if (!row) throw new Error("failed to upsert market_assets row");
    return row;
  }

  getBySymbol(symbol: string) {
    return this.db.query.marketAssets
      .findFirst({ where: sql`${marketAssets.symbol} = ${symbol}` })
      .then((r) => r ?? null);
  }

  search(query: string, limit = 25) {
    return this.db.query.marketAssets.findMany({
      where: ilike(marketAssets.symbol, `%${query}%`),
      limit,
    });
  }
}
