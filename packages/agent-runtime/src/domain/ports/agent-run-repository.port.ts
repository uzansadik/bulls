/**
 * @openbulls/agent-runtime — agent-run repository port.
 *
 * The runtime persists run + step + usage + snapshot state through
 * this contract. The default implementation lives in `@openbulls/db`
 * (Drizzle); tests inject a spy that records calls.
 *
 * This is a *type-only* re-export — the runtime does not depend on
 * `@openbulls/db` directly. Composition root (commit 15) wires the
 * concrete Drizzle implementation in.
 */
import type {
  AgentGraphSnapshot,
  AiAgentRun,
  AiAgentRunStep,
  AiToolCall,
  AiUsageEvent,
} from "@openbulls/db/schema";
import type { AgentRunStatus, StepStatus, ToolCallStatus } from "@openbulls/db/schema";

import type {
  CreateAgentRunInput,
  IAgentRunRepository,
  MarkStepFinishedInput,
  MarkToolCallFinishedInput,
  RecordAiUsageEventInput,
  RecordStepInput,
  RecordToolCallInput,
  SaveGraphSnapshotInput,
  UpdateAgentRunStatusInput,
} from "@openbulls/db/repositories";

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
};
export type {
  AiAgentRun,
  AiAgentRunStep,
  AiToolCall,
  AiUsageEvent,
  AgentGraphSnapshot,
  AgentRunStatus,
  StepStatus,
  ToolCallStatus,
};
