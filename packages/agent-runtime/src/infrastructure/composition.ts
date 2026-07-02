/**
 * @openbulls/agent-runtime — CompiledGraphBundle (composition root).
 *
 * Replaces `createAgentRuntimeServices` + `runGraph` / `resumeRun` /
 * `pauseRun` with a thin façade over LangGraph's native `invoke` /
 * `stream` calls.
 *
 * Workers construct one `CompiledGraphBundle` at boot, then drive
 * every agent run through `bundle.invoke(key, state, opts)` or
 * `bundle.stream(...)`. The checkpointer handles thread-scoped
 * state automatically — no manual `startFromIndex` math.
 */
import type { BaseCheckpointSaver } from "@langchain/langgraph";

import { annotationStateToAgentRunState } from "../domain/state-helpers";
import type { AgentRunState } from "../domain/state";
import type { GraphKey } from "../domain/graph";
import type {
  CompiledGraphDeps,
  CompiledGraphFactory,
} from "./graph-factory";

export interface CompiledGraphBundle {
  readonly graphs: Readonly<Record<string, ReadonlyArray<string>>>;
  invoke<S extends AgentRunState = AgentRunState>(
    graphKey: GraphKey,
    input: S,
    opts: { threadId: string; userId: string },
  ): Promise<S>;
  stream<S extends AgentRunState = AgentRunState>(
    graphKey: GraphKey,
    input: S,
    opts: { threadId: string; userId: string },
  ): AsyncIterable<{ event: string; data: unknown }>;
  readonly checkpointer: BaseCheckpointSaver;
  close(): Promise<void>;
}

interface CompiledGraphInternal {
  readonly graphKey: string;
  readonly compiled: unknown;
}

/**
 * Build a CompiledGraphBundle from a registry of factories + runtime
 * deps. Each factory is invoked exactly once at boot; their output
 * is cached on the bundle.
 *
 * `factories` is intentionally `Record<string, ...>` rather than
 * `Record<GraphKey, ...>` because `GraphKey` is a branded string —
 * index access via a literal key still satisfies the cast inside the
 * factory invocation.
 */
export function createCompiledGraphBundle(input: {
  factories: Record<string, CompiledGraphFactory<AgentRunState>>;
  deps: CompiledGraphDeps;
}): CompiledGraphBundle {
  const compiled: CompiledGraphInternal[] = [];
  for (const [key, factory] of Object.entries(input.factories)) {
    compiled.push({
      graphKey: key,
      compiled: factory(input.deps),
    });
  }
  const byKey = new Map(compiled.map((c) => [c.graphKey, c]));

  return {
    graphs: Object.fromEntries(
      compiled.map((c) => [c.graphKey, Object.keys(c.compiled as object)]),
    ),
    invoke: async <S extends AgentRunState = AgentRunState>(
      graphKey: GraphKey,
      input: S,
      opts: { threadId: string; userId: string },
    ): Promise<S> => {
      const entry = byKey.get(graphKey as unknown as string);
      if (!entry) {
        throw new Error(`unknown graph key: ${graphKey}`);
      }
      const compiledGraph = entry.compiled as {
        invoke: (i: unknown, c: unknown) => Promise<unknown>;
      };
      const result = (await compiledGraph.invoke(input, {
        configurable: { thread_id: opts.threadId, user_id: opts.userId },
      })) as unknown as Record<string, unknown>;
      return annotationStateToAgentRunState(result) as S;
    },
    stream: async function* <S extends AgentRunState = AgentRunState>(
      graphKey: GraphKey,
      input: S,
      opts: { threadId: string; userId: string },
    ): AsyncIterable<{ event: string; data: unknown }> {
      const entry = byKey.get(graphKey as unknown as string);
      if (!entry) {
        throw new Error(`unknown graph key: ${graphKey}`);
      }
      const compiledGraph = entry.compiled as {
        stream: (i: unknown, c: unknown) => AsyncIterable<unknown>;
      };
      const iterator = compiledGraph.stream(input, {
        configurable: { thread_id: opts.threadId, user_id: opts.userId },
      }) as AsyncIterable<Record<string, unknown>>;
      for await (const chunk of iterator) {
        yield {
          event: String(chunk.event ?? "values"),
          data: chunk.data,
        };
      }
    },
    checkpointer: input.deps.checkpointer,
    close: async () => {
      // BaseCheckpointSaver does not declare `close`; only concrete
      // adapters (e.g. PostgresSaver) do. Best-effort: check at
      // runtime via duck-typing.
      const saver = input.deps.checkpointer as unknown as {
        close?: () => Promise<void>;
      };
      await saver.close?.();
    },
  };
}