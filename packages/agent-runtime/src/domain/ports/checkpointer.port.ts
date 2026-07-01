/**
 * @openbulls/agent-runtime — checkpointer port.
 *
 * The runtime persists graph state to a pluggable backend. The default
 * implementation (`DrizzleCheckpointerSaver`) writes to the
 * `agent_graph_snapshots` table; tests can swap in an in-memory mock
 * that implements the same interface.
 *
 * The interface is intentionally narrow:
 *   - `save`   — upsert one checkpoint row (idempotent on (runId, checkpointId))
 *   - `load`   — fetch the most recent checkpoint for a (runId, threadId) pair
 *   - `list`   — fetch all checkpoints for a run, oldest first
 *
 * The state blob is opaque to the saver — the runtime parses it
 * through `parseAgentRunState` before/after transport.
 */
import type { AgentRunState } from "../state";

/** A snapshot row in the persistence backend. */
export interface CheckpointRecord {
  readonly runId: string;
  readonly threadId: string;
  readonly checkpointId: string;
  readonly nodeKey: string;
  readonly state: AgentRunState;
  readonly nextNodes: ReadonlyArray<string> | null;
  readonly version: number;
  readonly createdAt: string;
}

/** Pluggable snapshot persistence. */
export interface ICheckpointer {
  /** Persist (or update) a checkpoint. Idempotent on (runId, checkpointId). */
  save(input: {
    readonly runId: string;
    readonly threadId: string;
    readonly checkpointId: string;
    readonly nodeKey: string;
    readonly state: AgentRunState;
    readonly nextNodes?: ReadonlyArray<string> | null;
  }): Promise<CheckpointRecord>;

  /**
   * Load the latest checkpoint for a run. Returns null when no row
   * exists — first invocation of a fresh run, or after `clear`.
   */
  load(runId: string): Promise<CheckpointRecord | null>;

  /** List every checkpoint for a run, ordered by version ASC. */
  list(runId: string): Promise<readonly CheckpointRecord[]>;

  /**
   * Optional — when supported, drop all snapshots for a run. The
   * default Drizzle implementation issues a DELETE. Tests can omit.
   */
  clear?(runId: string): Promise<void>;
}
