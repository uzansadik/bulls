/**
 * apps/web — server-only tool registry wiring.
 *
 * Lazily builds the default `@openbulls/ai` tool registry on the
 * first call, then memoises the result inside the same server
 * process. Bundles `MarketDataServices` and `PortfolioServices`
 * once at composition time so the streaming route handler doesn't
 * re-pay provider/cache construction on every request.
 *
 * `bindForVercelAiSdk()` returns a record of `dynamicTool`s in the
 * shape the AI SDK v7 `streamText({ tools })` API understands.
 *
 * The factory expects raw `PortfolioDeps` + `MarketDataDeps` from
 * `@openbulls/ai`; we extract `MarketDataDeps` from
 * `MarketDataServices.deps` and build `PortfolioDeps` manually so
 * we don't re-pay the use-case closure cost paid by
 * `createPortfolioServices`.
 */
import "server-only";

import { type ToolRegistry, createDefaultToolRegistry } from "@openbulls/ai";
import { noopLogger } from "@openbulls/logger";
import { type MarketDataServices, createMarketDataServicesFromEnv } from "@openbulls/market-data";
import {
  type PortfolioDeps,
  type PortfolioServices,
  createPortfolioServices,
} from "@openbulls/portfolio";

import { db } from "@openbulls/db/client";
import { createRepositories } from "@openbulls/db/repositories";

let cached: {
  registry: ToolRegistry;
  market: MarketDataServices;
  portfolio: PortfolioServices;
} | null = null;

interface ChatToolBundle {
  readonly registry: ToolRegistry;
  readonly market: MarketDataServices;
  readonly portfolio: PortfolioServices;
  readonly bindForVercelAiSdk: () => Record<string, unknown>;
}

/**
 * Build (or return the cached) tool bundle for the chat surface.
 */
export function getChatToolBundle(): ChatToolBundle {
  if (cached) return withBinder(cached);

  const repos = createRepositories(db);
  const market = createMarketDataServicesFromEnv({
    env: {
      ...(process.env.YAHOO_FINANCE_API_KEY
        ? { YAHOO_FINANCE_API_KEY: process.env.YAHOO_FINANCE_API_KEY }
        : {}),
      ...(process.env.TWELVE_DATA_API_KEY
        ? { TWELVE_DATA_API_KEY: process.env.TWELVE_DATA_API_KEY }
        : {}),
      ...(process.env.KAP_API_KEY ? { KAP_API_KEY: process.env.KAP_API_KEY } : {}),
      ...(process.env.TCMB_API_KEY ? { TCMB_API_KEY: process.env.TCMB_API_KEY } : {}),
      ...(process.env.MARKET_DATA_USE_DB_CACHE
        ? { MARKET_DATA_USE_DB_CACHE: process.env.MARKET_DATA_USE_DB_CACHE }
        : {}),
    },
  });

  // `MarketDataServices` already implements the narrow
  // `IMarketDataQueryGateway` surface that `@openbulls/portfolio`
  // expects (same `getQuote` / `getFxRate` signatures on the deps
  // object). Treating the whole bundle as the gateway avoids a
  // separate adapter layer in the chat path.
  const portfolioDeps: PortfolioDeps = {
    portfolios: repos.portfolios,
    marketData: market as unknown as PortfolioDeps["marketData"],
    logger: noopLogger,
    now: () => new Date(),
  };

  const portfolio = createPortfolioServices(portfolioDeps);
  const registry = createDefaultToolRegistry({
    portfolio: portfolioDeps,
    marketData: market.deps,
  });

  cached = { registry, market, portfolio };
  return withBinder(cached);
}

function withBinder(cached: {
  registry: ToolRegistry;
  market: MarketDataServices;
  portfolio: PortfolioServices;
}): ChatToolBundle {
  return {
    registry: cached.registry,
    market: cached.market,
    portfolio: cached.portfolio,
    bindForVercelAiSdk: () => cached.registry.bindForVercelAiSdk(),
  };
}
