/**
 * @openbulls/agent-runtime — public barrel.
 *
 * Surface kept narrow on purpose. Workers and tests should import
 * from this file only — internal layout is free to evolve.
 */

// Domain
export {
  type AgentMessage,
  type AgentRunState,
  type Budget,
  type ExtendAgentRunState,
  type ToolInvocation,
  type UsageAggregate,
  agentMessageSchema,
  agentRunStateSchema,
  agentRunStatusSchema,
  agentRunStatusValues,
  budgetSchema,
  extendAgentRunState,
  parseAgentRunState,
  safeParseAgentRunState,
  toolInvocationSchema,
  usageAggregateSchema,
} from "./domain/state";
export {
  DuplicateGraphError,
  UnknownGraphError,
  CheckpointCorruptError,
  CheckpointNotFoundError,
  InsufficientCreditsError,
  BudgetExceededError,
  NodeExecutionFailedError,
  ToolCallFailedError,
  RunNotResumableError,
  InvalidRunInputError,
} from "./domain/errors";
export {
  GraphRegistry,
  type GraphDefinition,
  type GraphKey,
  type NodeDefinition,
  type NodeDeps,
} from "./domain/graph";
export { defineNode } from "./domain/nodes";

// Ports
export type {
  ICheckpointer,
  CheckpointRecord,
} from "./domain/ports/checkpointer.port";
export type {
  IAgentRunRepository,
  CreateAgentRunInput,
  UpdateAgentRunStatusInput,
  RecordStepInput,
  MarkStepFinishedInput,
  RecordToolCallInput,
  MarkToolCallFinishedInput,
  RecordAiUsageEventInput,
  SaveGraphSnapshotInput,
  AiAgentRun,
  AiAgentRunStep,
  AiToolCall,
  AiUsageEvent,
  AgentGraphSnapshot,
  AgentRunStatus,
  StepStatus,
  ToolCallStatus,
} from "./domain/ports/agent-run-repository.port";
export type {
  IJobsGateway,
  EnqueueAgentRunInput,
  EnqueueAgentRunResult,
} from "./domain/ports/jobs-gateway.port";
export type {
  IBillingGateway,
  ReserveCreditInput,
  ReserveCreditResult,
  FinalizeUsageInput,
  FinalizeUsageResult,
  RefundReservationInput,
  RefundReservationResult,
} from "./domain/ports/billing-gateway.port";
export type {
  IMarketDataGateway,
  GetQuoteRequest,
  GetCandlesRequest,
  GetFinancialStatementsRequest,
  GetNewsRequest,
  GetFxRateRequest,
} from "./domain/ports/market-data-gateway.port";
export type {
  IPortfolioGateway,
  GetPortfolioOverviewRequest,
  GetHoldingsRequest,
  GetPerformanceRequest,
} from "./domain/ports/portfolio-gateway.port";

// Infrastructure — composition + run helpers
export {
  createAgentRuntimeServices,
  createAgentRuntimeServicesFromEnv,
  type CreateAgentRuntimeServicesFromEnvDeps,
} from "./infrastructure/composition";
export { runGraph, resumeRun, pauseRun } from "./infrastructure/run-graph";
export { registerDefaultGraphs } from "./infrastructure/register-default-graphs";
export { DrizzleCheckpointerSaver } from "./infrastructure/checkpointer.saver";

// Billing guard nodes — agent subgraphs should mount `reserveCreditNode`
// at the entry and `finalizeUsageNode` at the exit (CLAUDE.md §11).
// `pauseCreditInsufficientNode` is a recovery terminal kept for
// explicit error-routing diagrams; runtime catches the error itself.
export { reserveCreditNode } from "./nodes/reserve-credit.node.js";
export { finalizeUsageNode } from "./nodes/finalize-usage.node.js";
export { pauseCreditInsufficientNode } from "./nodes/pause-credit-insufficient.node.js";
export { logStep } from "./nodes/log-step-node.js";

// Public types
export type {
  AgentRuntimeDeps,
  AgentRuntimeServices,
  RunGraphInput,
  RunGraphResult,
  PauseRunInput,
  LoggerLike,
  NowFn,
} from "./infrastructure/agent-runtime.types";
export { noopLogger } from "./infrastructure/agent-runtime.types";

// Subgraphs (so callers can register custom ones)
export {
  companyAnalysisGraph,
  type CompanyAnalysisInput,
  type CompanyAnalysisScratchpad,
  type CompanyAnalysisState,
} from "./subgraphs/company-analysis.subgraph";
export {
  portfolioReviewGraph,
  type PortfolioReviewInput,
  type PortfolioReviewScratchpad,
  type PortfolioReviewState,
} from "./subgraphs/portfolio-review.subgraph";
export {
  marketNewsGraph,
  type MarketNewsInput,
  type MarketNewsScratchpad,
  type MarketNewsState,
  type NewsHeadline,
} from "./subgraphs/market-news.subgraph";
