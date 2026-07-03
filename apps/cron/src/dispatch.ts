/**
 * apps/cron — `dispatch` adapter.
 *
 * Thin wrapper over `@openbulls/automation`'s `dispatchDueJobs`
 * command. Exists so a unit test can drive the dispatcher without
 * standing up the full process loop.
 */
import type { AutomationServices } from "@openbulls/automation";
import type { DispatchSummary } from "@openbulls/automation";

export interface DispatchAdapterInput {
  readonly automation: AutomationServices;
  readonly batchSize?: number;
}

export async function dispatchAdapter(input: DispatchAdapterInput): Promise<DispatchSummary> {
  return input.automation.dispatchDueJobs(
    input.batchSize !== undefined ? { batchSize: input.batchSize } : {},
  );
}
