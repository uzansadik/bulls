/**
 * @openbulls/ai — domain: tool permission tier.
 *
 * Three escalating tiers. The selector and the UI both consume this
 * enum so a `destructive` tool (e.g. `add-transaction`) can be
 * gated behind a confirmation prompt in the chat surface, while
 * `read` tools (e.g. `get-portfolio-overview`) fire silently.
 *
 * The agent-worker's executor uses the same enum to decide whether
 * a queued job requires manual approval before it touches user
 * state — `write` jobs can run unattended, `destructive` ones
 * pause for human-in-the-loop (CLAUDE.md §"Core Runtime Decision").
 */
import { z } from "zod";

export const toolPermissionSchema = z.enum(["read", "write", "destructive"]);
export type ToolPermission = z.infer<typeof toolPermissionSchema>;

export const ToolPermission = {
  of(value: ToolPermission): ToolPermission {
    return value;
  },
  parse(value: unknown): ToolPermission {
    return toolPermissionSchema.parse(value);
  },
  /** True when the tier requires human approval before execution. */
  requiresApproval(permission: ToolPermission): boolean {
    return permission === "destructive";
  },
} as const;
