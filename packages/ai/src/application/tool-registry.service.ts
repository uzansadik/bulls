import { dynamicTool } from "@ai-sdk/provider-utils";
import { DynamicStructuredTool } from "@langchain/core/tools";
/**
 * @openbulls/ai — application: tool registry.
 *
 * Holds the active set of `ToolSpec`s and exposes them in the
 * formats the runtimes need:
 *
 *   - `list()` — for selection + UI rendering
 *   - `find(name)` — for runtime dispatch
 *   - `bindForVercelAiSdk()` — Vercel AI SDK tool format (used by
 *     the chat `/api/chat` streaming route)
 *   - `bindForLangChain()` — LangChain `DynamicStructuredTool` format
 *     (used by the agent-runtime subgraph `call-model.node.ts`)
 *
 * Tools are registered via `register(tool)` at boot; the registry
 * itself is just an append-only map keyed by tool name. We do *not*
 * mutate tool specs at runtime — selection decides *which* tools
 * participate in a call, the registry decides *what* they look like
 * to each downstream adapter.
 *
 * Tool factories in `infrastructure/tools/` are pure constructors;
 * they receive any required deps (db, logger, services) and return
 * a `ToolSpec`. The composition root wires concrete deps; the
 * registry only knows about the abstract shape.
 */
import type { z } from "zod";

import { ToolNotFoundError } from "../domain/errors";
import type { AnyToolSpec, ToolContext } from "../domain/tool/tool-spec";

export interface ToolRegistry {
  /** Append a tool. Re-registering with the same name overwrites. */
  readonly register: (tool: AnyToolSpec) => void;
  /** Bulk register. Convenient for boot-time wiring. */
  readonly registerAll: (tools: ReadonlyArray<AnyToolSpec>) => void;
  /** All tools in registration order. */
  readonly list: () => ReadonlyArray<AnyToolSpec>;
  /** Look up a single tool by name. Throws when missing. */
  readonly find: (name: string) => AnyToolSpec;
  /** Subset of tools that match the given names (unknown names dropped). */
  readonly pick: (names: ReadonlyArray<string>) => ReadonlyArray<AnyToolSpec>;
  /** Vercel AI SDK tool dict (used by `streamText` / `generateText`). */
  readonly bindForVercelAiSdk: () => Record<string, unknown>;
  /** LangChain tool list (used by `ChatModel.bindTools` inside subgraphs). */
  readonly bindForLangChain: () => ReadonlyArray<DynamicStructuredTool>;
}

/**
 * Empty context — concrete callers (chat route, subgraph nodes)
 * populate this before invoking the tool. We deliberately do not
 * pass `undefined` for any field because the strict-optional flag
 * would reject it.
 */
const EMPTY_CONTEXT: ToolContext = {};

/**
 * Create a new empty registry. Each call yields an isolated instance;
 * tests use this to avoid global state leakage.
 */
export function createToolRegistry(): ToolRegistry {
  const store = new Map<string, AnyToolSpec>();
  const insertionOrder: string[] = [];

  function list(): ReadonlyArray<AnyToolSpec> {
    return insertionOrder.map((name) => {
      const t = store.get(name);
      if (!t) {
        throw new ToolNotFoundError(`tool vanished mid-iteration: ${name}`, name);
      }
      return t;
    });
  }

  return {
    register(t) {
      if (!store.has(t.name)) insertionOrder.push(t.name);
      store.set(t.name, t);
    },
    registerAll(tools) {
      for (const t of tools) {
        if (!store.has(t.name)) insertionOrder.push(t.name);
        store.set(t.name, t);
      }
    },
    list,
    find(name) {
      const t = store.get(name);
      if (!t) throw new ToolNotFoundError(`tool not registered: ${name}`, name);
      return t;
    },
    pick(names) {
      const out: AnyToolSpec[] = [];
      for (const name of names) {
        const t = store.get(name);
        if (t) out.push(t);
      }
      return out;
    },
    bindForVercelAiSdk() {
      const out: Record<string, unknown> = {};
      for (const t of list()) {
        out[t.name] = dynamicTool({
          description: t.description,
          inputSchema: t.schema as unknown as z.ZodTypeAny,
          execute: async (args: unknown) => t.execute(args as never, EMPTY_CONTEXT),
        });
      }
      return out;
    },
    bindForLangChain() {
      return list().map(
        (t) =>
          new DynamicStructuredTool({
            name: t.name,
            description: t.description,
            schema: t.schema as unknown as z.ZodTypeAny,
            func: async (args: unknown) =>
              JSON.stringify(await t.execute(args as never, EMPTY_CONTEXT)),
          }),
      );
    },
  };
}

/**
 * Construct a brand-new registry pre-loaded with a fixed set of
 * tools. The default factory is exposed for the boot composition
 * root so tests can build smaller per-fixture registries instead.
 */
export function buildToolRegistry(tools: ReadonlyArray<AnyToolSpec>): ToolRegistry {
  const reg = createToolRegistry();
  reg.registerAll(tools);
  return reg;
}

/**
 * Re-export for the LangChain tool wrapper used by `bindForLangChain`.
 * Surfaced here so consumers don't need to reach into `@langchain/core`.
 */
export { DynamicStructuredTool };
