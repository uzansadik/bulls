/**
 * In-memory `IAgentRunRepository` for tests. Records every call so
 * tests can assert on the order/method. Returns synthetic ids.
 */
import type {
  AgentGraphSnapshot,
  AiAgentRun,
  AiAgentRunStep,
  AiToolCall,
  AiUsageEvent,
} from "../domain/ports/agent-run-repository.port";
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
} from "../domain/ports/agent-run-repository.port";

let nextId = 1;
const newId = () => `id-${nextId++}`;

export class InMemoryAgentRunRepository implements IAgentRunRepository {
  readonly runs = new Map<string, AiAgentRun>();
  readonly steps: AiAgentRunStep[] = [];
  readonly toolCalls: AiToolCall[] = [];
  readonly usageEvents: AiUsageEvent[] = [];
  readonly snapshots = new Map<string, AgentGraphSnapshot[]>();
  readonly calls: Array<{ method: string; args: unknown }> = [];

  async create(input: CreateAgentRunInput): Promise<AiAgentRun> {
    this.calls.push({ method: "create", args: input });
    const id = newId();
    const row = {
      id,
      userId: input.userId,
      graphKey: input.graphKey,
      threadId: input.threadId,
      status: "running" as const,
      input: input.input,
      startedAt: new Date(),
    };
    this.runs.set(id, row as AiAgentRun);
    return row as AiAgentRun;
  }

  async getById(id: string): Promise<AiAgentRun | null> {
    return this.runs.get(id) ?? null;
  }

  async listByUser(): Promise<AiAgentRun[]> {
    return [...this.runs.values()];
  }

  async updateStatus(input: UpdateAgentRunStatusInput): Promise<void> {
    this.calls.push({ method: "updateStatus", args: input });
    const row = this.runs.get(input.id);
    if (row) {
      this.runs.set(input.id, {
        ...row,
        status: input.status,
        currentNodeKey: input.currentNodeKey ?? row.currentNodeKey,
      });
    }
  }

  async complete(id: string, output: unknown): Promise<void> {
    this.calls.push({ method: "complete", args: { id, output } });
    const row = this.runs.get(id);
    if (row) {
      this.runs.set(id, { ...row, status: "completed", output: output as never });
    }
  }

  async recordStep(input: RecordStepInput): Promise<AiAgentRunStep> {
    this.calls.push({ method: "recordStep", args: input });
    const step = {
      id: newId(),
      runId: input.runId,
      nodeKey: input.nodeKey,
      status: input.status,
      startedAt: input.startedAt ?? new Date(),
    };
    this.steps.push(step as AiAgentRunStep);
    return step as AiAgentRunStep;
  }

  async markStepFinished(input: MarkStepFinishedInput): Promise<void> {
    this.calls.push({ method: "markStepFinished", args: input });
  }

  async listStepsByRun(runId: string): Promise<AiAgentRunStep[]> {
    return this.steps.filter((s) => s.runId === runId);
  }

  async recordToolCall(input: RecordToolCallInput): Promise<AiToolCall> {
    this.calls.push({ method: "recordToolCall", args: input });
    const call = {
      id: newId(),
      stepId: input.stepId,
      toolKey: input.toolKey,
      status: input.status,
      args: input.args,
    };
    this.toolCalls.push(call as AiToolCall);
    return call as AiToolCall;
  }

  async markToolCallFinished(input: MarkToolCallFinishedInput): Promise<void> {
    this.calls.push({ method: "markToolCallFinished", args: input });
  }

  async recordUsageEvent(input: RecordAiUsageEventInput): Promise<AiUsageEvent> {
    this.calls.push({ method: "recordUsageEvent", args: input });
    const event = {
      id: newId(),
      runId: input.runId ?? null,
      modelKey: input.modelKey,
    };
    this.usageEvents.push(event as AiUsageEvent);
    return event as AiUsageEvent;
  }

  async listUsageEventsByRun(runId: string): Promise<AiUsageEvent[]> {
    return this.usageEvents.filter((e) => e.runId === runId);
  }

  async saveGraphSnapshot(input: SaveGraphSnapshotInput): Promise<AgentGraphSnapshot> {
    this.calls.push({ method: "saveGraphSnapshot", args: input });
    const snapshot = {
      id: newId(),
      runId: input.runId,
      checkpointId: input.checkpointId,
      nodeKey: input.nodeKey,
      state: input.state,
      nextNodes: input.nextNodes ?? null,
      createdAt: new Date(),
    };
    const existing = this.snapshots.get(input.runId) ?? [];
    existing.push(snapshot as AgentGraphSnapshot);
    this.snapshots.set(input.runId, existing);
    return snapshot as AgentGraphSnapshot;
  }

  async loadLatestSnapshot(runId: string): Promise<AgentGraphSnapshot | null> {
    const rows = this.snapshots.get(runId);
    return rows?.[rows.length - 1] ?? null;
  }

  async listSnapshotsByRun(runId: string): Promise<AgentGraphSnapshot[]> {
    return this.snapshots.get(runId) ?? [];
  }
}
