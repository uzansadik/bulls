/**
 * @openbulls/agent-runtime — LangGraph Annotation for AgentRunState.
 *
 * Mirrors `AgentRunState` (zod schema in `./state.ts`) as a LangGraph
 * `Annotation.Root(...)` so that the same typed shape can flow through
 * a `StateGraph` compiled with a checkpointer.
 *
 * Reducers preserve the merge semantics the custom runner used:
 *   - messages / toolInvocations -> append (`[...a, ...b]`)
 *   - scratchpad                 -> shallow merge (`{...a, ...b}`)
 *     enables every subgraph to write to its own keys without losing
 *     sibling writes from parallel branches (Send API fan-out).
 *   - usage / budget / error     -> overwrite (last-write-wins, as before)
 *
 * The optional fields use `Annotation<T | undefined>()` with no reducer;
 * `undefined` means "absent", which LangGraph encodes as a missing key.
 */
import { Annotation } from "@langchain/langgraph";

import type {
  AgentMessage,
  AgentRunStatus,
  Budget,
  ToolInvocation,
  UsageAggregate,
} from "./state";

export const AgentRunStateAnnotation = Annotation.Root({
  // Identity / routing
  runId: Annotation<string>(),
  threadId: Annotation<string>(),
  userId: Annotation<string>(),
  graphKey: Annotation<string>(),
  status: Annotation<AgentRunStatus>(),

  // Audit trail
  currentNode: Annotation<string | undefined>(),
  nextNode: Annotation<string | undefined>(),
  startedAt: Annotation<string>(),
  finishedAt: Annotation<string | undefined>(),

  // Append-only streams
  messages: Annotation<AgentMessage[]>({
    reducer: (a: AgentMessage[], b: AgentMessage[]) => [...a, ...b],
    default: () => [] as AgentMessage[],
  }),

  /**
   * Subgraph-private key/value bag. The reducer is a shallow merge —
   * 4 parallel branches may all write to different keys, and the next
   * node still sees every key (unlike object replace which would clobber).
   */
  scratchpad: Annotation<Record<string, unknown>>({
    reducer: (a: Record<string, unknown>, b: Record<string, unknown>) => ({
      ...a,
      ...b,
    }),
    default: () => ({}),
  }),

  toolInvocations: Annotation<ToolInvocation[]>({
    reducer: (a: ToolInvocation[], b: ToolInvocation[]) => [...a, ...b],
    default: () => [] as ToolInvocation[],
  }),

  // Telemetry — overwrite semantics (one budget per run)
  usage: Annotation<UsageAggregate | undefined>(),
  budget: Annotation<Budget | undefined>(),
  error: Annotation<string | undefined>(),
});

/**
 * Inferred LangGraph state type — value of `AgentRunStateAnnotation.State`.
 * This is what `compiled.invoke` / `compiled.stream` returns.
 */
export type AgentRunStateValue = typeof AgentRunStateAnnotation.State;
