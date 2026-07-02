/**
 * apps/agent-worker — portfolio gateway adapter.
 *
 * Bridges `@openbulls/portfolio` use-case surface to the
 * `IPortfolioGateway` port the runtime expects from portfolio
 * subgraph nodes.
 *
 * Error swallowing: when a portfolio query returns `err` (e.g. a
 * brand-new user with no portfolios yet), the adapter returns
 * `null` or `[]` so the downstream node can degrade gracefully.
 * The runtime never crashes a subgraph on a missing portfolio —
 * it just produces an empty `portfolio-impact` branch.
 */
import type {
  GetHoldingsRequest,
  GetPerformanceRequest,
  GetPortfolioOverviewRequest,
  IPortfolioGateway,
} from "@openbulls/agent-runtime";
import type { LoggerLike, PortfolioServices } from "@openbulls/portfolio";
import { noopLogger } from "@openbulls/portfolio";

export function createPortfolioAdapter(
  services: PortfolioServices,
  logger: LoggerLike = noopLogger,
): IPortfolioGateway {
  return {
    async getPortfolioOverview(req: GetPortfolioOverviewRequest): Promise<unknown> {
      const result = await services.getPortfolioOverview({ portfolioId: req.portfolioId });
      if (!result.ok) {
        logger.warn("portfolio.getPortfolioOverview failed", {
          portfolioId: req.portfolioId,
          err: result.error.message,
        });
        return null;
      }
      return result.value;
    },

    async getHoldings(req: GetHoldingsRequest): Promise<ReadonlyArray<unknown>> {
      const result = await services.getHoldings({ portfolioId: req.portfolioId });
      if (!result.ok) {
        logger.warn("portfolio.getHoldings failed", {
          portfolioId: req.portfolioId,
          err: result.error.message,
        });
        return [];
      }
      return result.value;
    },

    async getPerformance(req: GetPerformanceRequest): Promise<unknown> {
      const result = await services.getPortfolioPerformance({
        portfolioId: req.portfolioId,
        from: new Date(req.from),
        to: new Date(req.to),
      });
      if (!result.ok) {
        logger.warn("portfolio.getPortfolioPerformance failed", {
          portfolioId: req.portfolioId,
          err: result.error.message,
        });
        return null;
      }
      return result.value;
    },
  };
}
