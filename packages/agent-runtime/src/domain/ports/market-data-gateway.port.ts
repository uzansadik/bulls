/**
 * @openbulls/agent-runtime — market-data gateway port.
 *
 * Subgraph nodes that fetch quotes / candles / news / financial
 * statements talk to market-data through this narrow port. Each
 * method mirrors the corresponding `@openbulls/market-data`
 * application query so the runtime can call them 1:1.
 *
 * The runtime intentionally does NOT depend on the market-data
 * package — return types are kept as `unknown` so the runtime can
 * pass results through to downstream nodes without re-validating
 * shapes. The narrow contract keeps mock implementation trivial.
 */
export interface GetQuoteRequest {
  readonly symbol: string;
}

export interface GetCandlesRequest {
  readonly symbol: string;
  readonly interval: "1d" | "1h" | "5m";
  readonly limit: number;
}

export interface GetFinancialStatementsRequest {
  readonly symbol: string;
}

export interface GetNewsRequest {
  readonly symbols: ReadonlyArray<string>;
  readonly from?: string;
  readonly to?: string;
}

export interface GetFxRateRequest {
  readonly from: string;
  readonly to: string;
}

export interface IMarketDataGateway {
  getQuote(req: GetQuoteRequest): Promise<unknown>;
  getCandles(req: GetCandlesRequest): Promise<unknown>;
  getFinancialStatements(req: GetFinancialStatementsRequest): Promise<unknown>;
  getNews(req: GetNewsRequest): Promise<ReadonlyArray<unknown>>;
  getFxRate(req: GetFxRateRequest): Promise<unknown>;
}
