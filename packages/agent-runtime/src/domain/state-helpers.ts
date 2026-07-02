/**
 * @openbulls/agent-runtime — bridges between AgentRunState (zod) and
 * the LangGraph Annotation value type.
 *
 * Three concerns:
 *   1. `agentRunStateToAnnotation()` — feed a freshly-built
 *      `AgentRunState` into `graph.invoke()` as the initial payload.
 *      Date strings + optional fields must match the annotation's shape.
 *   2. `annotationStateToAgentRunState()` — turn whatever LangGraph
 *      yielded back into the canonical `AgentRunState`. Tolerates
 *      `undefined` for optional keys.
 *   3. `parseAgentRunState` (already in `state.ts`) — round-trip
 *      validation against the zod schema, used by tests + checkpointer.
 *
 * Both directions are pure; no I/O. The annotation's reducer logic
 * already handles merging when a partial update is returned from a
 * node, so this layer is only for *initial state* and *result
 * extraction*.
 */
import type { AgentRunState, AgentRunStatus, Budget, UsageAggregate } from "./state";
import type { AgentRunStateValue } from "./langgraph-annotation";

/** Initial payload for `graph.invoke()` or `graph.stream()`. */
export function agentRunStateToAnnotation(
  state: AgentRunState,
): Partial<AgentRunStateValue> {
  return {
    runId: state.runId,
    threadId: state.threadId,
    userId: state.userId,
    graphKey: state.graphKey,
    status: state.status,
    startedAt: state.startedAt,
    messages: state.messages ?? [],
    scratchpad: state.scratchpad ?? {},
    toolInvocations: state.toolInvocations ?? [],
    ...(state.currentNode !== undefined ? { currentNode: state.currentNode } : {}),
    ...(state.nextNode !== undefined ? { nextNode: state.nextNode } : {}),
    ...(state.finishedAt !== undefined ? { finishedAt: state.finishedAt } : {}),
    ...(state.usage !== undefined ? { usage: state.usage as UsageAggregate } : {}),
    ...(state.budget !== undefined ? { budget: state.budget as Budget } : {}),
    ...(state.error !== undefined ? { error: state.error } : {}),
  };
}

/** Convert a LangGraph state value back into AgentRunState. */
export function annotationStateToAgentRunState(
  value: AgentRunStateValue,
): AgentRunState {
  return {
    runId: value.runId,
    threadId: value.threadId,
    userId: value.userId,
    graphKey: value.graphKey,
    status: (value.status ?? "completed") as AgentRunStatus,
    startedAt: value.startedAt ?? new Date(0).toISOString(),
    messages: value.messages ?? [],
    scratchpad: value.scratchpad ?? {},
    toolInvocations: value.toolInvocations ?? [],
    ...(value.currentNode !== undefined ? { currentNode: value.currentNode } : {}),
    ...(value.nextNode !== undefined ? { nextNode: value.nextNode } : {}),
    ...(value.finishedAt !== undefined
      ? { finishedAt: value.finishedAt }
      : {}),
    ...(value.usage !== undefined ? { usage: value.usage } : {}),
    ...(value.budget !== undefined ? { budget: value.budget } : {}),
    ...(value.error !== undefined ? { error: value.error } : {}),
  };
}
