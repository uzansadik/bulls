/**
 * @openbulls/agent-runtime — public service interfaces.
 *
 * The composition root returns `AgentRuntimeServices` so callers
 * (workers, tests, future API handlers) don't reach into private
 * packages or instantiate internals themselves.
 *
 * Keep this file thin — interfaces only, no logic.
 */
import type { GraphKey } from "../domain/graph";
import type { GraphRegistry } from "../domain/graph";
import type { IAgentRunRepository } from "../domain/ports/agent-run-repository.port";
import type { IBillingGateway } from "../domain/ports/billing-gateway.port";
import type { ICheckpointer } from "../domain/ports/checkpointer.port";
import type { IJobsGateway } from "../domain/ports/jobs-gateway.port";
import type { IMarketDataGateway } from "../domain/ports/market-data-gateway.port";
import type { IPortfolioGateway } from "../domain/ports/portfolio-gateway.port";

/** Logger shape every node receives. */
export interface LoggerLike {
  info: (msg: string, ctx?: Record<string, unknown>) => void;
  warn: (msg: string, ctx?: Record<string, unknown>) => void;
  error: (msg: string, ctx?: Record<string, unknown>) => void;
}

/** Wall-clock injected for tests. Returns epoch ms. */
export type NowFn = () => number;

/** Inputs the composition root needs to wire everything together. */
export interface AgentRuntimeDeps {
  readonly graphRegistry: GraphRegistry;
  readonly agentRuns: IAgentRunRepository;
  readonly checkpointer: ICheckpointer;
  readonly billing: IBillingGateway;
  readonly marketData: IMarketDataGateway;
  readonly portfolio: IPortfolioGateway;
  readonly jobs: IJobsGateway;
  readonly logger: LoggerLike;
  readonly now: NowFn;
}

/** Inputs the public surface accepts to drive a graph run. */
export interface RunGraphInput {
  readonly runId: string;
  readonly threadId: string;
  readonly userId: string;
  readonly graphKey: GraphKey;
  readonly input: unknown;
}

/** Result of executing a graph — `completed` when END reached. */
export type RunGraphResult =
  | { readonly status: "completed"; readonly state: unknown }
  | { readonly status: "paused"; readonly state: unknown; readonly reason: string }
  | { readonly status: "failed"; readonly state: unknown; readonly error: string };

/** Inputs to manually pause a run (e.g. from external API). */
export interface PauseRunInput {
  readonly runId: string;
  readonly reason: string;
}

/** Public surface of the package. */
export interface AgentRuntimeServices {
  readonly graphRegistry: GraphRegistry;
  readonly runGraph: (input: RunGraphInput) => Promise<RunGraphResult>;
  readonly pauseRun: (input: PauseRunInput) => Promise<void>;
  readonly resumeRun: (input: RunGraphInput) => Promise<RunGraphResult>;
}
