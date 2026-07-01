/**
 * @openbulls/agent-runtime — AgentRunState schema.
 *
 * The state carried by every graph run. Subgraphs may extend it via
 * the `extends` mechanism — the `state` argument to a node always
 * satisfies `AgentRunState`, while a subgraph's typed builder works
 * against a more specific `S extends AgentRunState`.
 *
 * The Zod schema validates snapshots restored from the checkpointer.
 * We deliberately keep it permissive (passthrough + non-strict) so
 * forward-compatible state additions don't invalidate old runs.
 */
import { z } from "zod";

/** Numeric strings — kept as strings to preserve precision. */
const numericString = z.string().regex(/^-?\d+(\.\d+)?$/);

/** Branded-ish identifiers carried in state. */
const idString = z.string().min(1);

/** Status of the run as the runtime sees it. Mirrors DB enum loosely. */
export const agentRunStatusValues = [
  "pending",
  "running",
  "paused",
  "completed",
  "failed",
  "cancelled",
] as const;
export type AgentRunStatus = (typeof agentRunStatusValues)[number];

export const agentRunStatusSchema = z.enum(agentRunStatusValues);

/** A single tool invocation captured in state. */
export const toolInvocationSchema = z.object({
  toolName: idString,
  input: z.unknown(),
  output: z.unknown().optional(),
  error: z.string().optional(),
  latencyMs: z.number().int().nonnegative(),
  invokedAt: z.string(),
});
export type ToolInvocation = z.infer<typeof toolInvocationSchema>;

/** Cost + token telemetry rolled up per node. */
export const usageAggregateSchema = z.object({
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  costUsd: numericString,
});
export type UsageAggregate = z.infer<typeof usageAggregateSchema>;

/** Cost guard rail enforced by billing nodes. */
export const budgetSchema = z.object({
  estimatedCost: numericString,
  reservedCost: numericString.optional(),
  finalCost: numericString.optional(),
  reservationId: idString.optional(),
});
export type Budget = z.infer<typeof budgetSchema>;

/** Scoped chat-style messages that LangGraph nodes can append to. */
export const agentMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string(),
  toolCallId: idString.optional(),
  toolName: idString.optional(),
  ts: z.string(),
});
export type AgentMessage = z.infer<typeof agentMessageSchema>;

/** The base AgentRunState. Subgraphs may add typed extensions. */
export const agentRunStateSchema = z.object({
  runId: idString,
  threadId: idString,
  userId: idString,
  graphKey: idString,
  status: agentRunStatusSchema,
  currentNode: idString.optional(),
  nextNode: idString.optional(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  messages: z.array(agentMessageSchema).default([]),
  scratchpad: z.record(z.unknown()).default({}),
  toolInvocations: z.array(toolInvocationSchema).default([]),
  usage: usageAggregateSchema.optional(),
  budget: budgetSchema.optional(),
  error: z.string().optional(),
});
export type AgentRunState = z.infer<typeof agentRunStateSchema>;

/**
 * Validate a state blob (typically a deserialized snapshot). Returns
 * a normalized, defaulted object ready to be fed into a graph.
 */
export function parseAgentRunState(input: unknown): AgentRunState {
  return agentRunStateSchema.parse(input);
}

/** Safe variant — returns a result tuple instead of throwing. */
export function safeParseAgentRunState(input: unknown) {
  return agentRunStateSchema.safeParse(input);
}

/**
 * Subgraph-specific state extensions. The base `AgentRunState` is
 * intersected with whatever the subgraph adds. Use this for typed
 * builder helpers without losing compatibility with `parseAgentRunState`.
 */
export type ExtendAgentRunState<T> = AgentRunState & T;

/** Helper to safely extend a state object without losing defaults. */
export function extendAgentRunState<T extends Record<string, unknown>>(
  base: AgentRunState,
  extension: T,
): ExtendAgentRunState<T> {
  return { ...base, ...extension };
}
