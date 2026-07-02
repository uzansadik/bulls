/**
 * @openbulls/agent-runtime — portfolio gateway port.
 *
 * Narrow view over `@openbulls/portfolio` for the agent-runtime.
 * Return types are kept `unknown` to avoid forcing the runtime to
 * pull in the portfolio package's domain types — subgraph nodes
 * shape the data they need through `state.scratchpad`.
 */
export interface GetPortfolioOverviewRequest {
  readonly portfolioId: string;
}

export interface GetHoldingsRequest {
  readonly portfolioId: string;
}

export interface GetPerformanceRequest {
  readonly portfolioId: string;
  readonly from: string;
  readonly to: string;
}

export interface IPortfolioGateway {
  getPortfolioOverview(req: GetPortfolioOverviewRequest): Promise<unknown>;
  getHoldings(req: GetHoldingsRequest): Promise<ReadonlyArray<unknown>>;
  getPerformance(req: GetPerformanceRequest): Promise<unknown>;
}
