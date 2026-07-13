/**
 * @openbulls/agent-runtime — default subgraph factory registry.
 *
 * The `defaultGraphFactories` map keys each production subgraph
 * (`company-analysis`, `portfolio-review`, `market-news`) to its
 * `CompiledGraphFactory`. `apps/agent-worker` registers this map
 * with `createCompiledGraphBundle` at boot.
 *
 * Tests construct a partial registry with stub deps; production
 * wires the full set + PostgresSaver.
 */
import { GraphKey } from "../domain/graph";
import type { CompiledGraphFactory } from "./graph-factory";
import { companyAnalysisGraph } from "../subgraphs/company-analysis.subgraph";
import { marketNewsGraph } from "../subgraphs/market-news.subgraph";
import { portfolioReviewGraph } from "../subgraphs/portfolio-review.subgraph";
import { reportWriterGraph } from "../subgraphs/report-writer.subgraph";

export const defaultGraphFactories: Record<string, CompiledGraphFactory> = {
  [GraphKey("company-analysis")]: companyAnalysisGraph,
  [GraphKey("portfolio-review")]: portfolioReviewGraph,
  [GraphKey("market-news")]: marketNewsGraph,
  [GraphKey("report-writer")]: reportWriterGraph,
};

export const defaultGraphKeys: ReadonlyArray<string> = Object.keys(
  defaultGraphFactories,
).sort();