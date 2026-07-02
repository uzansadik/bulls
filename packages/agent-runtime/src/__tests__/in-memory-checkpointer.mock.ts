/**
 * In-memory `ICheckpointer` for tests. Stores `CheckpointRecord`
 * rows in a Map keyed by runId. Loads return the most recent record.
 */
import type { CheckpointRecord, ICheckpointer } from "../domain/ports/checkpointer.port";
import type { AgentRunState } from "../domain/state";

export class InMemoryCheckpointer implements ICheckpointer {
  private readonly rows = new Map<string, CheckpointRecord[]>();

  async save(input: {
    readonly runId: string;
    readonly threadId: string;
    readonly checkpointId: string;
    readonly nodeKey: string;
    readonly state: AgentRunState;
    readonly nextNodes?: ReadonlyArray<string> | null;
  }): Promise<CheckpointRecord> {
    const existing = this.rows.get(input.runId) ?? [];
    const record: CheckpointRecord = {
      runId: input.runId,
      threadId: input.threadId,
      checkpointId: input.checkpointId,
      nodeKey: input.nodeKey,
      state: input.state,
      nextNodes: input.nextNodes ?? null,
      version: existing.length + 1,
      createdAt: new Date().toISOString(),
    };
    existing.push(record);
    this.rows.set(input.runId, existing);
    return record;
  }

  async load(runId: string): Promise<CheckpointRecord | null> {
    const rows = this.rows.get(runId);
    if (!rows || rows.length === 0) return null;
    return rows[rows.length - 1] ?? null;
  }

  async list(runId: string): Promise<readonly CheckpointRecord[]> {
    return this.rows.get(runId) ?? [];
  }

  async clear(runId: string): Promise<void> {
    this.rows.delete(runId);
  }
}
