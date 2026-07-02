/**
 * @openbulls/agent-runtime — register-default-graphs helper.
 *
 * Wires the three production subgraphs onto a registry:
 *   - company-analysis  (multi-branch research)
 *   - portfolio-review  (risk + recommendations)
 *   - market-news       (dedupe + cluster digest)
 *
 * The composition root in `apps/agent-worker` calls this once at boot;
 * tests can register a custom subset by importing the graph modules
 * directly.
 */
import { GraphRegistry } from "../domain/graph";
import { companyAnalysisGraph } from "../subgraphs/company-analysis.subgraph";
import { marketNewsGraph } from "../subgraphs/market-news.subgraph";
import { portfolioReviewGraph } from "../subgraphs/portfolio-review.subgraph";

/** Register the production subgraphs onto the provided (or fresh) registry. */
export function registerDefaultGraphs(
  registry: GraphRegistry = new GraphRegistry(),
): GraphRegistry {
  return registry
    .register(companyAnalysisGraph)
    .register(portfolioReviewGraph)
    .register(marketNewsGraph);
}
