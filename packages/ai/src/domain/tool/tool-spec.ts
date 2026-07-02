/**
 * @openbulls/ai — domain: tool specification.
 *
 * A `ToolSpec` is the universal description of an AI-callable tool.
 * It carries a Zod schema (for argument validation), an `execute`
 * function (the actual side-effect), and a permission tier (so the
 * selector / UI / executor can gate it consistently).
 *
 * Two things this type does *not* carry on purpose:
 *   1. A model-specific binding (Vercel AI SDK tool format,
 *      LangChain DynamicStructuredTool, OpenAI function-calling,
 *      etc.) — adapters in `infrastructure/gateway/` translate
 *      `ToolSpec[]` to whatever runtime needs.
 *   2. Auth context (`userId`, `tenantId`) — `execute` receives the
 *      validated args plus whatever `context` the caller passes at
 *      invocation time. This keeps specs reusable across users.
 *
 * CLAUDE.md §8 ("AI tools should call package services"): each tool's
 * `execute` body is *always* a thin wrapper that calls a package
 * application command/query. No business logic in tool files.
 */
import type { z } from "zod";

import type { ToolPermission } from "./tool-permission";

/**
 * Free-form invocation context. Adapters populate this from the
 * caller — a server action will set `userId`, the agent-worker
 * will set `runId` + `threadId`, etc.
 */
export interface ToolContext {
  readonly userId?: string;
  readonly runId?: string;
  readonly threadId?: string;
  readonly sessionId?: string;
  readonly traceId?: string;
  [key: string]: unknown;
}

export interface ToolSpec<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  /** Stable, kebab-case identifier; visible to the model. */
  readonly name: string;
  /** Human-readable description; sent to the model verbatim. */
  readonly description: string;
  /** Argument schema. Validated before `execute` is called. */
  readonly schema: TSchema;
  /** Permission tier. Drives selection + UI gating. */
  readonly permission: ToolPermission;
  /** Side-effect — calls a package application command/query. */
  readonly execute: (args: z.infer<TSchema>, context: ToolContext) => Promise<unknown>;
  /** Optional metadata for tooling, telemetry, or selector hints. */
  readonly meta?: Readonly<Record<string, unknown>>;
}

/**
 * Type-erased form used by registries and adapters that don't need
 * the per-tool schema parameter. The branded factory hides the
 * generic so consumers can hold `AnyToolSpec[]` without `as`.
 */
export type AnyToolSpec = ToolSpec<z.ZodTypeAny>;

export const ToolSpec = {
  /**
   * Identity cast — attach the right brand without runtime cost.
   * Use this when constructing concrete tool defs.
   */
  of<TSchema extends z.ZodTypeAny>(spec: ToolSpec<TSchema>): ToolSpec<TSchema> {
    return spec;
  },
} as const;
