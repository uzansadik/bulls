/**
 * @openbulls/portfolio — narrow market-data query gateway.
 *
 * The portfolio domain only needs two read-side queries from the
 * market-data package: latest quote and FX rate. Rather than
 * import the full `MarketDataServices` surface (and its many
 * adapter dependencies), we depend on this narrow port. The
 * composition root injects an adapter that wraps the relevant
 * market-data methods and maps `MarketDataError` →
 * `PortfolioError` (typically `RepositoryError` with the original
 * code/message attached).
 */
import type { Result } from "@openbulls/shared";
import type { AssetSymbol } from "../symbol";
import type { Currency, Money } from "../brands";
import type { FxRate } from "../fx-rate";
import type { PortfolioError } from "../errors";

export interface MarketDataQuote {
  readonly symbol: AssetSymbol;
  readonly price: Money;
  readonly currency: Currency;
  readonly asOf: Date;
}

export interface IMarketDataQueryGateway {
  getQuote(input: {
    readonly symbol: AssetSymbol;
    readonly maxAgeMs?: number;
  }): Promise<Result<MarketDataQuote, PortfolioError>>;

  getFxRate(input: {
    readonly base: Currency;
    readonly quote: Currency;
    readonly asOf?: Date;
    readonly maxAgeMs?: number;
  }): Promise<Result<FxRate, PortfolioError>>;
}