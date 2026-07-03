import type { IScheduledJobExecutionRepository } from "../infrastructure/repositories/ports";
/**
 * @openbulls/automation — `markExecutionResult` + `attachAgentRunToExecution`.
 *
 * Both helpers are tiny wrappers over the
 * `IScheduledJobExecutionRepository`. The dispatcher also calls them
 * directly, so they live in `application/` (not `infrastructure/`) and
 * take the repository through `AutomationDeps` rather than a Drizzle
 * client.
 *
 * The handler in `apps/agent-worker` calls `markExecutionResult` for
 * every dispatch it processes. Idempotency is enforced at the DB
 * level by the repository's status guards — see
 * `infrastructure/repositories/scheduled-job-execution.repository.ts`.
 */
import type { AttachAgentRunInput, MarkExecutionResultInput } from "./jobs.types";

export interface MarkExecutionResultDeps {
  readonly repo: IScheduledJobExecutionRepository;
  readonly now?: () => Date;
}

export async function markExecutionResult(
  deps: MarkExecutionResultDeps,
  input: MarkExecutionResultInput,
): Promise<void> {
  if (input.status === "failed" && !input.reason) {
    throw new Error("markExecutionResult: `reason` is required when status='failed'");
  }
  if (input.status === "skipped" && !input.reason) {
    throw new Error("markExecutionResult: `reason` is required when status='skipped'");
  }
  switch (input.status) {
    case "running":
      await deps.repo.markRunning(input.executionId, null);
      break;
    case "succeeded":
      await deps.repo.markSucceeded(input.executionId);
      break;
    case "failed":
      await deps.repo.markFailed(input.executionId, input.reason ?? "unspecified");
      break;
    case "skipped":
      await deps.repo.markSkipped(input.executionId, input.reason ?? "unspecified");
      break;
  }
}

export interface AttachAgentRunDeps {
  readonly repo: IScheduledJobExecutionRepository;
}

export async function attachAgentRunToExecution(
  deps: AttachAgentRunDeps,
  input: AttachAgentRunInput,
): Promise<void> {
  await deps.repo.attachAgentRun(input.executionId, input.agentRunId);
}

// Re-export so the barrel pulls from one place.
export type { MarkExecutionResultInput, AttachAgentRunInput };
export type { IScheduledJobExecutionRepository };
