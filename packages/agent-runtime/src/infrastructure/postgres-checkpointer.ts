/**
 * @openbulls/agent-runtime — PostgresSaver factory.
 *
 * Thin wrapper around `@langchain/langgraph-checkpoint-postgres`'s
 * `PostgresSaver` that:
 *
 *   1. Constructs the saver from a connection string.
 *   2. Runs `setup()` synchronously the first time so the
 *      `checkpoints`, `checkpoint_blobs`, `checkpoint_writes` tables
 *      exist in the target schema.
 *
 * `setup()` is idempotent — running it twice is a no-op once the
 * tables are present — so it's safe to call on every worker boot.
 *
 * Note: this replaces the custom `DrizzleCheckpointerSaver` that
 * wrote to `agent_graph_snapshots`. That table is now deprecated;
 * we may drop it in a separate migration after this PR lands.
 */
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

export interface CreatePostgresSaverOptions {
  readonly connectionString: string;
  /** Postgres schema — defaults to `public`. */
  readonly schema?: string;
}

export async function createPostgresSaver(
  opts: CreatePostgresSaverOptions,
): Promise<PostgresSaver> {
  const saver = PostgresSaver.fromConnString(opts.connectionString, {
    ...(opts.schema ? { schema: opts.schema } : {}),
  });
  await saver.setup();
  return saver;
}