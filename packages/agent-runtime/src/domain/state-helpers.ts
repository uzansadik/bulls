/**
 * @openbulls/agent-runtime — bridges between AgentRunState (zod) and
 * the LangGraph Annotation value type.
 *
 * Three concerns:
 *   1. `agentRunStateToAnnotation()` — feed a freshly-built
 *      `AgentRunState` into `graph.invoke()` as the initial payload.
 *   2. `annotationStateToAgentRunState()` — turn whatever LangGraph
 *      yielded back into the canonical `AgentRunState`.
 *   3. `parseAgentRunState` (already in `state.ts`) — round-trip
 *      validation against the zod schema, used by tests + checkpointer.
 *
 * Both directions are pure; no I/O. The annotation's reducer logic
 * already handles merging when a partial update is returned from a
 * node, so this layer is only for *initial state* and *result
 * extraction*.
 *
 * The helpers take `Record<string, unknown>` deliberately — the
 * precise LangGraph `StateType<...>` is a private derived type and
 * not ergonomic to import into callers. We destructure by key.
 */
import type { AgentRunState, AgentRunStatus, Budget, UsageAggregate } from "./state";

type AnnotationValueShape = Record<string, unknown>;

/** Initial payload for `graph.invoke()` or `graph.stream()`. */
export function agentRunStateToAnnotation(
  state: AgentRunState,
): AnnotationValueShape {
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
  value: AnnotationValueShape,
): AgentRunState {
  const v = value as Record<string, unknown>;
  return {
    runId: String(v.runId ?? ""),
    threadId: String(v.threadId ?? ""),
    userId: String(v.userId ?? ""),
    graphKey: String(v.graphKey ?? ""),
    status: (v.status ?? "completed") as AgentRunStatus,
    startedAt: String(v.startedAt ?? new Date(0).toISOString()),
    messages: (Array.isArray(v.messages) ? v.messages : []) as AgentRunState["messages"],
    scratchpad: (v.scratchpad && typeof v.scratchpad === "object" ? v.scratchpad : {}) as Record<string, unknown>,
    toolInvocations: (Array.isArray(v.toolInvocations) ? v.toolInvocations : []) as AgentRunState["toolInvocations"],
    ...(v.currentNode !== undefined ? { currentNode: String(v.currentNode) } : {}),
    ...(v.nextNode !== undefined ? { nextNode: String(v.nextNode) } : {}),
    ...(v.finishedAt !== undefined ? { finishedAt: String(v.finishedAt) } : {}),
    ...(v.usage !== undefined ? { usage: v.usage as UsageAggregate } : {}),
    ...(v.budget !== undefined ? { budget: v.budget as Budget } : {}),
    ...(v.error !== undefined ? { error: String(v.error) } : {}),
  };
}
