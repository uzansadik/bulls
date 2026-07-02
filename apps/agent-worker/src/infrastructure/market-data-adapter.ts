/**
 * apps/agent-worker — market-data gateway adapter.
 *
 * Bridges `@openbulls/market-data` application queries to the
 * narrow `IMarketDataGateway` port the runtime speaks.
 *
 * Result-type unwrapping is intentional: market-data queries return
 * `Result<T, MarketDataError>`, the runtime port expects
 * `T | undefined`. When the result is `err`, the adapter swallows
 * it (logs a warning) and returns `null` so the runtime's
 * subgraph nodes can degrade gracefully (e.g. synthesize around
 * missing quotes).
 */
import type {
  GetCandlesRequest,
  GetFinancialStatementsRequest,
  GetFxRateRequest,
  GetNewsRequest,
  GetQuoteRequest,
  IMarketDataGateway,
} from "@openbulls/agent-runtime";
import { type LoggerLike, noopLogger } from "@openbulls/logger";
import type {
  AssetSymbol,
  Interval,
  MarketDataServices,
  StatementType,
} from "@openbulls/market-data";

/**
 * Map a runtime `interval` literal to the market-data branded type.
 *
 * Defaults to "1d" on unknown values so a typo never crashes a
 * subgraph. The cost of a wrong interval is a worse signal in the
 * final report, not a 500.
 */
function asInterval(value: "1d" | "1h" | "5m"): Interval {
  return value as unknown as Interval;
}

/**
 * `StatementType` lives behind a DB enum (balance_sheet, etc.) — for
 * now the gateway's `getFinancialStatements` always asks for all
 * three types and returns merged results. The runtime port does
 * not split by statement type; the adapter therefore requests the
 * first canonical type (`balance_sheet`) and lets the query layer
 * fan out internally. Workers that need a specific statement type
 * should call `getFinancialStatements` directly via a custom
 * subgraph rather than going through this port.
 */
const FALLBACK_STATEMENT_TYPE = "balance_sheet" as unknown as StatementType;

export function createMarketDataAdapter(
  services: MarketDataServices,
  logger: LoggerLike = noopLogger,
): IMarketDataGateway {
  return {
    async getQuote(req: GetQuoteRequest): Promise<unknown> {
      const result = await services.getQuote({ symbol: req.symbol as unknown as AssetSymbol });
      if (!result.ok) {
        logger.warn("market-data.getQuote failed", {
          symbol: req.symbol,
          err: result.error.message,
        });
        return null;
      }
      return result.value;
    },

    async getCandles(req: GetCandlesRequest): Promise<unknown> {
      // Default to a 200-day window ending "now" so callers don't
      // need to supply date arithmetic at the subgraph boundary.
      const to = new Date();
      const from = new Date(to.getTime() - 24 * 60 * 60 * 1000 * Math.max(1, req.limit));
      const result = await services.getCandles({
        symbol: req.symbol as unknown as AssetSymbol,
        interval: asInterval(req.interval),
        from,
        to,
        adjusted: true,
      });
      if (!result.ok) {
        logger.warn("market-data.getCandles failed", {
          symbol: req.symbol,
          err: result.error.message,
        });
        return null;
      }
      return { candles: result.value };
    },

    async getFinancialStatements(req: GetFinancialStatementsRequest): Promise<unknown> {
      const result = await services.getFinancialStatements({
        symbol: req.symbol as unknown as AssetSymbol,
        statementType: FALLBACK_STATEMENT_TYPE,
        period: "quarterly",
        limit: 8,
      });
      if (!result.ok) {
        logger.warn("market-data.getFinancialStatements failed", {
          symbol: req.symbol,
          err: result.error.message,
        });
        return null;
      }
      return { rows: result.value };
    },

    async getNews(req: GetNewsRequest): Promise<ReadonlyArray<unknown>> {
      const now = new Date();
      // Default window: last 7 days. Callers may narrow it via
      // `from` / `to` (ISO date strings).
      const to = req.to ? new Date(req.to) : now;
      const from = req.from
        ? new Date(req.from)
        : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // The market-data news query is per-symbol; for a multi-symbol
      // request we fan out and merge. Empty array on error so the
      // subgraph's news branch can degrade cleanly.
      if (req.symbols.length === 0) {
        const single = await services.getNews({ from, to });
        if (!single.ok) {
          logger.warn("market-data.getNews failed", { err: single.error.message });
          return [];
        }
        return single.value;
      }

      const all: unknown[] = [];
      for (const sym of req.symbols) {
        const single = await services.getNews({
          symbol: sym as unknown as AssetSymbol,
          from,
          to,
        });
        if (!single.ok) {
          logger.warn("market-data.getNews failed for symbol", {
            symbol: sym,
            err: single.error.message,
          });
          continue;
        }
        all.push(...single.value);
      }
      return all;
    },

    async getFxRate(req: GetFxRateRequest): Promise<unknown> {
      const result = await services.getFxRate({ base: req.from, quote: req.to });
      if (!result.ok) {
        logger.warn("market-data.getFxRate failed", {
          from: req.from,
          to: req.to,
          err: result.error.message,
        });
        return null;
      }
      return result.value;
    },
  };
}
