import type { MarketDataDeps } from "@openbulls/market-data";
/**
 * @openbulls/ai — application: default tool registry factory.
 *
 * One-stop composition for the 18 starter tools. Boot code calls
 * `createDefaultToolRegistry({portfolio, marketData})` with the
 * already-bound deps from `@openbulls/portfolio` and
 * `@openbulls/market-data` composition roots; the factory wires
 * every tool spec and returns a populated `ToolRegistry`.
 *
 * Why a single factory instead of letting each caller compose its
 * own registry:
 *   - The tool set is the canonical surface the chat and the
 *     subgraph layer agree on. Diverging registries would cause
 *     one side to expose a tool the other cannot execute.
 *   - Tests can still swap the entire registry via
 *     `createToolRegistry()` + `registerAll(...)` for tighter
 *     fixture control.
 *
 * Note that the automation tools do not require deps because the
 * underlying service is not yet implemented (see
 * `infrastructure/tools/automation-tools.ts`).
 */
import type { PortfolioDeps } from "@openbulls/portfolio";

import { makeAutomationTools } from "../infrastructure/tools/automation-tools";
import { makeFinancialsTools } from "../infrastructure/tools/financials-tools";
import { makeMarketDataTools } from "../infrastructure/tools/market-data-tools";
import { makePortfolioTools } from "../infrastructure/tools/portfolio-tools";
import { type ToolRegistry, buildToolRegistry } from "./tool-registry.service";

export interface DefaultToolRegistryDeps {
  readonly portfolio: PortfolioDeps;
  readonly marketData: MarketDataDeps;
}

/**
 * Build a registry pre-loaded with every starter tool (4 portfolio
 * + 6 market-data + 5 financials + 3 automation = 18). Returns the
 * same shape as `createToolRegistry`; downstream adapters pick the
 * view they need.
 */
export function createDefaultToolRegistry(deps: DefaultToolRegistryDeps): ToolRegistry {
  const tools = [
    ...makePortfolioTools(deps.portfolio),
    ...makeMarketDataTools(deps.marketData),
    ...makeFinancialsTools(deps.marketData),
    ...makeAutomationTools(),
  ];
  return buildToolRegistry(tools);
}
