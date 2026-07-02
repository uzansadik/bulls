import {
  CheckpointCorruptError,
  CheckpointNotFoundError,
  InsufficientCreditsError,
} from "../domain/errors";
import type { NodeDeps } from "../domain/graph";
import type { GraphKey } from "../domain/graph";
import type { IAgentRunRepository } from "../domain/ports/agent-run-repository.port";
import type { ICheckpointer } from "../domain/ports/checkpointer.port";
/**
 * @openbulls/agent-runtime — runGraph helper.
 *
 * The single entry point that `apps/agent-worker` and tests use to
 * execute (or resume) a graph run. Owns:
 *
 *  • node iteration with idempotent-node skipping
 *  • snapshot I/O via the checkpointer (one row per node)
 *  • run-status bookkeeping via the agent-run repository
 *  • pause-on-error semantics (does not throw for InsufficientCredits;
 *    returns RunGraphResult)
 *
 * Resume semantics:
 *  1. `checkpointer.load(runId)` returns the latest `state` we wrote.
 *  2. If present, iterate forward from the node whose `currentNode`
 *     matches the snapshot; idempotent nodes that already executed
 *     are skipped.
 *  3. If absent, build a fresh state via `graph.buildState(...)`.
 */
import type { AgentRunState } from "../domain/state";
import type {
  AgentRuntimeDeps,
  LoggerLike,
  RunGraphInput,
  RunGraphResult,
} from "./agent-runtime.types";

const MAX_RETRIES = 3;

function buildNodeDeps(
  runtime: Pick<
    AgentRuntimeDeps,
    "agentRuns" | "billing" | "marketData" | "portfolio" | "logger" | "now"
  >,
): NodeDeps {
  return {
    logger: runtime.logger,
    now: runtime.now,
    agentRuns: runtime.agentRuns,
    billing: runtime.billing,
    marketData: runtime.marketData,
    portfolio: runtime.portfolio,
  };
}

interface ExecuteArgs {
  readonly graph: import("../domain/graph").GraphDefinition<AgentRunState>;
  readonly checkpointer: ICheckpointer;
  readonly agentRuns: IAgentRunRepository;
  readonly nodeDeps: NodeDeps;
  readonly logger: LoggerLike;
  readonly runId: string;
  readonly threadId: string;
  readonly userId: string;
  readonly graphKey: GraphKey;
  readonly input: unknown;
}

/**
 * Core loop — shared between runGraph (fresh) and resumeRun (continuing).
 * Iterates nodes from `startFromIndex`, snapshots each successful step.
 */
async function execute(
  args: ExecuteArgs,
  prebuiltState: AgentRunState | undefined,
  startFromIndex: number,
): Promise<RunGraphResult> {
  const {
    graph,
    checkpointer,
    agentRuns,
    nodeDeps,
    logger,
    runId,
    threadId,
    userId,
    graphKey,
    input,
  } = args;

  const idempotent = graph.idempotentNodes ?? new Set<string>();

  // 1. Resolve starting state.
  let state: AgentRunState;
  let isFresh = false;
  if (prebuiltState) {
    state = prebuiltState;
  } else {
    const snap = await checkpointer.load(runId).catch((err) => {
      if (err instanceof CheckpointNotFoundError) return null;
      throw err;
    });
    if (snap) {
      state = snap.state;
      logger.info("resuming from snapshot", {
        runId,
        nodeKey: snap.nodeKey,
      });
    } else {
      state = graph.buildState({ runId, threadId, userId, input });
      isFresh = true;
    }
  }

  // 2. Persist run row (only on first invocation).
  if (isFresh) {
    await agentRuns.create({
      userId,
      graphKey,
      threadId,
      input,
    });
  }

  // 3. Iterate nodes from `startFromIndex`.
  const nodes = graph.nodes;
  for (let i = startFromIndex; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node) continue;
    if (idempotent.has(node.name) && state.currentNode === node.name) {
      // already executed against this state — skip (idempotent replay)
      continue;
    }

    let attempt = 0;
    let success = false;
    let lastError: unknown = null;
    while (attempt < MAX_RETRIES && !success) {
      attempt++;
      try {
        const patch = await node.run(state, nodeDeps);
        state = { ...state, ...patch } as AgentRunState;
        const nextNodeName = nodes[i + 1]?.name;
        await checkpointer.save({
          runId,
          threadId,
          checkpointId: `${runId}:${i + 1}`,
          nodeKey: node.name,
          state,
          nextNodes: nextNodeName ? [nextNodeName] : null,
        });
        success = true;
        logger.info("node ok", { runId, node: node.name, index: i });
      } catch (err) {
        lastError = err;
        logger.warn("node failed", {
          runId,
          node: node.name,
          attempt,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
    if (!success) {
      const reason = lastError instanceof Error ? lastError.message : "node execution failed";
      if (lastError instanceof InsufficientCreditsError) {
        await agentRuns.updateStatus({
          id: runId,
          status: "paused",
          currentNodeKey: node.name,
          error: "insufficient credits",
        });
        return { status: "paused", state, reason: "insufficient credits" };
      }
      await agentRuns.updateStatus({
        id: runId,
        status: "failed",
        currentNodeKey: node.name,
        error: reason,
      });
      return { status: "failed", state, error: reason };
    }
  }

  // 4. Wrap-up — mark completed, return final state.
  const finalState: AgentRunState = {
    ...state,
    status: "completed",
    finishedAt: new Date(nodeDeps.now()).toISOString(),
  };
  await agentRuns.complete(runId, { currentNode: state.currentNode }).catch((err: unknown) => {
    logger.warn("complete update failed", { runId, err: String(err) });
  });
  return { status: "completed", state: finalState };
}

/** Public helper — fresh run. */
export async function runGraph(
  deps: AgentRuntimeDeps,
  input: RunGraphInput,
): Promise<RunGraphResult> {
  const { checkpointer, agentRuns, logger } = deps;
  const nodeDeps = buildNodeDeps(deps);
  const graph = deps.graphRegistry.findAs<AgentRunState>(input.graphKey);
  try {
    return await execute(
      {
        graph,
        checkpointer,
        agentRuns,
        nodeDeps,
        logger,
        ...input,
      },
      undefined,
      0,
    );
  } catch (err) {
    if (err instanceof CheckpointCorruptError) {
      logger.error("checkpoint corrupt — aborting", {
        runId: input.runId,
        err: err.message,
      });
    }
    throw err;
  }
}

/** Resume a previously-paused run from its latest snapshot. */
export async function resumeRun(
  deps: AgentRuntimeDeps,
  input: RunGraphInput,
): Promise<RunGraphResult> {
  const { checkpointer, agentRuns, logger } = deps;
  const nodeDeps = buildNodeDeps(deps);
  const graph = deps.graphRegistry.findAs<AgentRunState>(input.graphKey);
  const snap = await checkpointer.load(input.runId);
  if (!snap) {
    return {
      status: "failed",
      state: graph.buildState({
        runId: input.runId,
        threadId: input.threadId,
        userId: input.userId,
        input: input.input,
      }),
      error: "no checkpoint to resume",
    };
  }
  const nodes = graph.nodes;
  const startFromIndex = snap.nodeKey
    ? nodes.findIndex(
        (n: import("../domain/graph").NodeDefinition<AgentRunState>) => n.name === snap.nodeKey,
      ) + 1
    : 0;
  return execute(
    {
      graph,
      checkpointer,
      agentRuns,
      nodeDeps,
      logger,
      ...input,
    },
    snap.state,
    startFromIndex,
  );
}

/** Pause a run — flips DB status. No state mutation on the snapshot. */
export async function pauseRun(
  deps: Pick<AgentRuntimeDeps, "agentRuns" | "logger">,
  input: { readonly runId: string; readonly reason: string },
): Promise<void> {
  const { agentRuns, logger } = deps;
  await agentRuns.updateStatus({
    id: input.runId,
    status: "paused",
    error: input.reason,
  });
  logger.info("run paused", { runId: input.runId, reason: input.reason });
}
