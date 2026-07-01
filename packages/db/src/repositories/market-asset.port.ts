import type { MarketAsset, NewMarketAsset } from "../schema/market-assets.schema";

export interface UpsertMarketAssetInput {
  symbol: string;
  exchange?: string | null;
  name: string;
  assetType: MarketAsset["assetType"];
  currency: string;
  isin?: string | null;
  sector?: string | null;
  metadata?: Record<string, unknown>;
}

export interface IMarketAssetRepository {
  upsert(input: UpsertMarketAssetInput): Promise<MarketAsset>;
  getBySymbol(symbol: string): Promise<MarketAsset | null>;
  search(query: string, limit?: number): Promise<MarketAsset[]>;
}

export type { MarketAsset, NewMarketAsset };
