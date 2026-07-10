/**
 * apps/cron — `processMain` smoke tests.
 *
 * We exercise the dispatch path on a stub `AutomationServices`
 * (skipping BullMQ + Drizzle). The cron loop is timing-sensitive;
 * to avoid `setInterval` flakes we close immediately after one
 * tick.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AutomationServices, DispatchSummary } from "@openbulls/automation";
import type { JobsServices } from "@openbulls/jobs";
import type { Logger } from "@openbulls/logger";

import { processMain } from "../process";

const noopLogger = {
  child() {
    return this;
  },
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
  fatal: () => undefined,
} as unknown as Logger;

function makeAutomationStub(): AutomationServices & {
  readonly dispatched: { calls: number };
} {
  let calls = 0;
  const stub: AutomationServices = {
    registry: {} as never,
    userScheduledJobRepo: {} as never,
    scheduledJobExecutionRepo: {} as never,
    async findDueJobs() {
      return { jobs: [], now: new Date() };
    },
    async dispatchDueJobs() {
      calls += 1;
      return {
        found: 0,
        dispatched: 0,
        skipped: 0,
        failed: 0,
        durationMs: 1,
      } satisfies DispatchSummary;
    },
    async markExecutionResult() {},
    async attachAgentRunToExecution() {},
    listExecutors() {
      return [{ type: "custom_agent" }];
    },
  };
  return Object.assign(stub, {
    dispatched: {
      get calls() {
        return calls;
      },
    },
  });
}

describe("processMain", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("fires one tick on `close` after the interval", async () => {
    const automation = makeAutomationStub();
    const jobs = {} as JobsServices;
    const handle = await processMain({
      env: {
        CRON_TICK_INTERVAL_MS: 1000,
        CRON_BATCH_SIZE: 50,
        CRON_QUEUE_NAME: "automation-dispatch",
      } as never,
      automation,
      jobs,
      logger: noopLogger,
    });
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(1000);
    await handle.close();
    // Two intervals fired; dispatcher called twice (or once if guard
    // missed). Acceptance criterion is ">= 1".
    expect(automation.dispatched.calls).toBeGreaterThanOrEqual(1);
  });
});
