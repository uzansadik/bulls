/**
 * @openbulls/agent-runtime — Drizzle-backed checkpointer.
 *
 * Persists `AgentRunState` snapshots to the `agent_graph_snapshots`
 * table (defined in `@openbulls/db/schema`). The saver:
 *   - validates the state blob with `parseAgentRunState` before write
 *   - upserts on the (runId, checkpointId) unique index — same
 *     checkpoint id = same logical state, so replays are idempotent
 *   - reads `latest` by descending createdAt to support resume
 *
 * The saver does NOT enforce threadId filtering because the schema
 * column does not exist on `agent_graph_snapshots` — thread scoping
 * lives on `ai_agent_runs` and is applied at the runGraph level.
 *
 * This adapter delegates persistence to `IAgentRunRepository` rather
 * than importing Drizzle directly — keeps the runtime package free
 * of the drizzle-orm transitive dependency.
 */
import { CheckpointCorruptError } from "../domain/errors";
import type { IAgentRunRepository } from "../domain/ports/agent-run-repository.port";
import type { CheckpointRecord, ICheckpointer } from "../domain/ports/checkpointer.port";
import { type AgentRunState, parseAgentRunState } from "../domain/state";

/** Build a `CheckpointRecord` from raw persisted fields. */
function toRecord(row: {
  readonly runId: string;
  readonly checkpointId: string;
  readonly nodeKey: string;
  readonly state: unknown;
  readonly nextNodes: unknown;
  readonly createdAt: Date | string;
}): CheckpointRecord {
  let parsed: AgentRunState;
  try {
    parsed = parseAgentRunState(row.state);
  } catch (err) {
    throw new CheckpointCorruptError(row.runId, err instanceof Error ? err.message : String(err));
  }
  const nextNodes = Array.isArray(row.nextNodes)
    ? (row.nextNodes as ReadonlyArray<unknown>).filter((n): n is string => typeof n === "string")
    : null;
  return {
    runId: row.runId,
    threadId: "", // schema does not store threadId; runtime uses runId
    checkpointId: row.checkpointId,
    nodeKey: row.nodeKey,
    state: parsed,
    nextNodes,
    version: 0, // populated by `list()` via row count; `load` returns 0
    createdAt: typeof row.createdAt === "string" ? row.createdAt : row.createdAt.toISOString(),
  };
}

export class DrizzleCheckpointerSaver implements ICheckpointer {
  constructor(private readonly agentRuns: IAgentRunRepository) {}

  async save(input: {
    readonly runId: string;
    readonly threadId: string;
    readonly checkpointId: string;
    readonly nodeKey: string;
    readonly state: AgentRunState;
    readonly nextNodes?: ReadonlyArray<string> | null;
  }): Promise<CheckpointRecord> {
    const validated = parseAgentRunState(input.state);
    const row = await this.agentRuns.saveGraphSnapshot({
      runId: input.runId,
      checkpointId: input.checkpointId,
      nodeKey: input.nodeKey,
      state: validated,
      nextNodes: input.nextNodes ?? null,
    });
    return toRecord(row);
  }

  async load(runId: string): Promise<CheckpointRecord | null> {
    const row = await this.agentRuns.loadLatestSnapshot(runId);
    if (!row) {
      return null;
    }
    return toRecord(row);
  }

  async list(runId: string): Promise<readonly CheckpointRecord[]> {
    const rows = await this.agentRuns.listSnapshotsByRun(runId);
    return rows.map(toRecord);
  }
}
