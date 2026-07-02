/**
 * @openbulls/ai — infrastructure: automation tools.
 *
 * Three AI-callable tools that manage user-created scheduled jobs.
 *
 *   - create-scheduled-job (write)   — create a recurring job
 *   - pause-scheduled-job   (write)   — pause a job by id
 *   - list-scheduled-jobs   (read)    — list jobs owned by the user
 *
 * **Important:** as of Faz 4 the `@openbulls/automation` package is
 * still a skeleton (`export {};`) — the real command/query surface
 * is scheduled for Faz 5. These tools therefore return a structured
 * stub response that the model can acknowledge gracefully. The
 * public shape is stable so the `ToolSpec`s here will not need to
 * move once the underlying service ships; only the execute bodies
 * will be swapped for real implementations.
 *
 * Permission tiers reflect the real semantics so the selector +
 * UI gating already work end-to-end.
 */
import { z } from "zod";

import type { ToolSpec } from "../../domain/tool/tool-spec";

/**
 * Sentinel result every automation tool returns while the package
 * is still a skeleton. Centralised so the model always sees the
 * same acknowledgement shape.
 */
function notImplementedYet(
  toolName: string,
  hint?: string,
): {
  readonly status: "not-implemented";
  readonly tool: string;
  readonly message: string;
} {
  return {
    status: "not-implemented",
    tool: toolName,
    message:
      hint ??
      "Automation package is scheduled for Faz 5; this tool is wired but the underlying service has not landed yet.",
  };
}

export function makeCreateScheduledJobTool(): ToolSpec<z.ZodTypeAny> {
  return {
    name: "create-scheduled-job",
    description:
      "Create a recurring scheduled job for the current user (e.g. portfolio daily review, price alert). The job runs through the agent-worker.",
    schema: z.object({
      name: z.string().min(1).max(120),
      kind: z.string().min(1).describe("Job kind, e.g. 'portfolio-daily-review'."),
      cron: z.string().min(1).describe("Standard 5-field cron expression in user-local time."),
      payload: z
        .record(z.unknown())
        .optional()
        .describe("Free-form payload passed to the executor."),
    }),
    permission: "write",
    meta: { source: "automation" },
    execute: async () => notImplementedYet("create-scheduled-job"),
  };
}

export function makePauseScheduledJobTool(): ToolSpec<z.ZodTypeAny> {
  return {
    name: "pause-scheduled-job",
    description: "Pause a previously created scheduled job by id.",
    schema: z.object({
      jobId: z.string().min(1),
    }),
    permission: "write",
    meta: { source: "automation" },
    execute: async (args) =>
      notImplementedYet(
        "pause-scheduled-job",
        `would have paused job ${(args as { jobId: string }).jobId}`,
      ),
  };
}

export function makeListScheduledJobsTool(): ToolSpec<z.ZodTypeAny> {
  return {
    name: "list-scheduled-jobs",
    description: "List scheduled jobs owned by the current user.",
    schema: z.object({
      status: z.enum(["active", "paused", "all"]).default("all"),
      limit: z.number().int().positive().max(100).optional(),
    }),
    permission: "read",
    meta: { source: "automation" },
    execute: async () => notImplementedYet("list-scheduled-jobs"),
  };
}

/**
 * Convenience aggregator.
 */
export function makeAutomationTools(): ReadonlyArray<ToolSpec<z.ZodTypeAny>> {
  return [makeCreateScheduledJobTool(), makePauseScheduledJobTool(), makeListScheduledJobsTool()];
}
