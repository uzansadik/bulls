/**
 * apps/cron — `findDueJobs` adapter.
 *
 * Thin wrapper over `@openbulls/automation`'s `findDueJobs` query.
 * Kept separate from the main process so a unit test can drive the
 * dispatcher directly without booting BullMQ.
 */
import type { AutomationServices } from "@openbulls/automation";

export interface FindDueJobsAdapterInput {
  readonly automation: AutomationServices;
  readonly batchSize?: number;
}

export async function findDueJobsAdapter(
  input: FindDueJobsAdapterInput,
): ReturnType<AutomationServices["findDueJobs"]> {
  return input.automation.findDueJobs(
    input.batchSize !== undefined ? { batchSize: input.batchSize } : {},
  );
}
