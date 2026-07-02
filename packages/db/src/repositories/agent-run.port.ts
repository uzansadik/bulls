import type {
  AgentGraphSnapshot,
  AiAgentRun,
  AiAgentRunStep,
  AiToolCall,
  AiUsageEvent,
} from "../schema/ai.schema";
import type { AgentRunStatus, StepStatus, ToolCallStatus } from "../schema/enums";

// ─── Agent Runs ──────────────────────────────────────────────────────────────

export interface CreateAgentRunInput {
  /**
   * Optional explicit id. When provided, the row is inserted with
   * that id — the runtime uses this to align `ai_agent_runs.id`
   * with the BullMQ job id / snapshot.runId so that resume can
   * find the row by id. When omitted, the DB default generates a
   * fresh id (useful for tests + backfills).
   */
  id?: string;
  userId: string;
  graphKey: string;
  threadId: string;
  input: unknown;
  reservationId?: string | null;
}

export interface UpdateAgentRunStatusInput {
  id: string;
  status: AgentRunStatus;
  error?: string;
  currentNodeKey?: string;
}

export interface IAgentRunRepository {
  // Runs
  create(input: CreateAgentRunInput): Promise<AiAgentRun>;
  getById(id: string): Promise<AiAgentRun | null>;
  listByUser(userId: string, status?: AgentRunStatus): Promise<AiAgentRun[]>;
  updateStatus(input: UpdateAgentRunStatusInput): Promise<void>;
  complete(id: string, output: unknown): Promise<void>;

  // Steps
  recordStep(input: RecordStepInput): Promise<AiAgentRunStep>;
  markStepFinished(input: MarkStepFinishedInput): Promise<void>;
  listStepsByRun(runId: string): Promise<AiAgentRunStep[]>;

  // Tool calls
  recordToolCall(input: RecordToolCallInput): Promise<AiToolCall>;
  markToolCallFinished(input: MarkToolCallFinishedInput): Promise<void>;

  // Usage events
  recordUsageEvent(input: RecordAiUsageEventInput): Promise<AiUsageEvent>;
  listUsageEventsByRun(runId: string): Promise<AiUsageEvent[]>;

  // Graph snapshots
  saveGraphSnapshot(input: SaveGraphSnapshotInput): Promise<AgentGraphSnapshot>;
  loadLatestSnapshot(runId: string): Promise<AgentGraphSnapshot | null>;
  listSnapshotsByRun(runId: string): Promise<AgentGraphSnapshot[]>;
}

// ─── Agent Run Steps ─────────────────────────────────────────────────────────

export interface RecordStepInput {
  runId: string;
  nodeKey: string;
  subagentKey?: string | null;
  status: StepStatus;
  attempt?: number;
  inputSnapshot?: unknown;
  outputSnapshot?: unknown;
  error?: string | null;
  startedAt?: Date;
  completedAt?: Date | null;
}

export interface MarkStepFinishedInput {
  id: string;
  status: Extract<StepStatus, "succeeded" | "failed" | "skipped">;
  outputSnapshot?: unknown;
  error?: string | null;
  completedAt?: Date;
}

// ─── Tool Calls ──────────────────────────────────────────────────────────────

export interface RecordToolCallInput {
  stepId: string;
  toolKey: string;
  args: unknown;
  status: ToolCallStatus;
  result?: unknown;
  error?: string | null;
  completedAt?: Date | null;
}

export interface MarkToolCallFinishedInput {
  id: string;
  status: Extract<ToolCallStatus, "succeeded" | "failed" | "denied">;
  result?: unknown;
  error?: string | null;
  completedAt?: Date;
}

// ─── Usage Events ────────────────────────────────────────────────────────────

export interface RecordAiUsageEventInput {
  userId: string;
  runId?: string | null;
  stepId?: string | null;
  modelKey: string;
  provider: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number | null;
  rawUsage?: unknown;
}

// ─── Graph Snapshots ─────────────────────────────────────────────────────────

export interface SaveGraphSnapshotInput {
  runId: string;
  checkpointId: string;
  nodeKey: string;
  state: unknown;
  nextNodes?: unknown;
}

// ─── Combined Repository Surface ─────────────────────────────────────────────
//
// The repository is split across three logical groupings (runs, steps+tools,
// snapshots) but consumers typically inject one instance and call into all of
// it. We extend the existing run-only port with the new groups via the same
// `IAgentRunRepository` interface to keep call-sites stable.
//
// Re-exports preserve existing imports.

export type { AiAgentRun, NewAiAgentRun } from "../schema/ai.schema";
export type { StepStatus, ToolCallStatus, AgentRunStatus } from "../schema/enums";
