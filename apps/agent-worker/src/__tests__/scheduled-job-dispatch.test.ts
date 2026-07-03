/**
 * apps/agent-worker — `scheduled-job-dispatch` handler smoke tests.
 *
 * Mocks the registry + repositories. We never touch BullMQ or Drizzle.
 */
import { describe, expect, it } from "vitest";

import type { LoggerLike } from "@openbulls/agent-runtime";
import type {
  AutomationServices,
  IScheduledJobExecutionRepository,
  IUserScheduledJobRepository,
} from "@openbulls/automation";
import { JobIdValue, type ScheduledJobDispatchJob } from "@openbulls/jobs";

import { makeScheduledJobDispatchHandler } from "../scheduled-job-dispatch-handler";

const noopLogger: LoggerLike = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

function makeJob(overrides: Partial<ScheduledJobDispatchJob> = {}): ScheduledJobDispatchJob {
  return {
    kind: "scheduled-job-dispatch",
    jobId: JobIdValue("bull-1"),
    executionId: "exec-1",
    userId: "user-1",
    jobDefinitionKey: "j-1",
    payload: { executorType: "custom_agent", payload: {} },
    enqueuedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("scheduled-job-dispatch handler", () => {
  it("happy path: marks running, runs executor, marks succeeded", async () => {
    const calls: string[] = [];
    const repo: IScheduledJobExecutionRepository = {
      async createQueued() {
        throw new Error("not used");
      },
      async markRunning(id) {
        calls.push(`running:${id}`);
      },
      async markSucceeded(id) {
        calls.push(`succeeded:${id}`);
      },
      async markFailed(id, reason) {
        calls.push(`failed:${id}:${reason}`);
      },
      async markSkipped(id, reason) {
        calls.push(`skipped:${id}:${reason}`);
      },
      async attachAgentRun() {},
      async getById(id) {
        return {
          id,
          jobId: "j-1",
          status: "queued",
          startedAt: new Date(),
          completedAt: null,
          error: null,
          payload: {},
          agentRunId: null,
        };
      },
    };
    const userRepo: IUserScheduledJobRepository = {
      async findDue() {
        return [];
      },
      async advanceNextRunAt() {},
      async getById() {
        return {
          id: "j-1",
          userId: "user-1",
          name: "j",
          description: null,
          executorType: "custom_agent",
          cron: "* * * * *",
          timezone: "UTC",
          inputPayload: { graphKey: "portfolio-review", input: {} },
          status: "active",
          nextRunAt: new Date(),
          lastRunAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
      async create() {
        throw new Error("not used");
      },
      async listByUser() {
        return [];
      },
      async setStatus() {},
    };

    const automation: AutomationServices = {
      registry: {
        get: () => ({
          type: "custom_agent",
          buildPayload: (raw) => ({
            graphKey: (raw.graphKey as string) ?? "x",
            input: (raw.input as Record<string, unknown>) ?? {},
          }),
          run: async () => ({
            kind: "agent-run",
            downstreamJobIds: ["agent-1"],
          }),
        }),
        has: () => true,
        register: () => {},
        list: () => [],
      },
      userScheduledJobRepo: userRepo,
      scheduledJobExecutionRepo: repo,
      async findDueJobs() {
        return { jobs: [], now: new Date() };
      },
      async dispatchDueJobs() {
        return { found: 0, dispatched: 0, skipped: 0, failed: 0, durationMs: 0 };
      },
      async markExecutionResult() {},
      async attachAgentRunToExecution() {},
      listExecutors() {
        return [];
      },
    };

    const handler = makeScheduledJobDispatchHandler({
      automation,
      userScheduledJobRepo: userRepo,
      scheduledJobExecutionRepo: repo,
      logger: noopLogger,
      now: () => new Date(),
    });

    await handler(makeJob());
    expect(calls).toContain("running:exec-1");
    expect(calls).toContain("succeeded:exec-1");
  });

  it("idempotency: already-succeeded execution is a no-op", async () => {
    const calls: string[] = [];
    const repo: IScheduledJobExecutionRepository = {
      async createQueued() {
        throw new Error("not used");
      },
      async markRunning(id) {
        calls.push(`running:${id}`);
      },
      async markSucceeded(id) {
        calls.push(`succeeded:${id}`);
      },
      async markFailed(id, reason) {
        calls.push(`failed:${id}:${reason}`);
      },
      async markSkipped(id, reason) {
        calls.push(`skipped:${id}:${reason}`);
      },
      async attachAgentRun() {},
      async getById(id) {
        return {
          id,
          jobId: "j-1",
          status: "succeeded",
          startedAt: new Date(),
          completedAt: new Date(),
          error: null,
          payload: {},
          agentRunId: null,
        };
      },
    };
    const userRepo: IUserScheduledJobRepository = {
      async findDue() {
        return [];
      },
      async advanceNextRunAt() {},
      async getById() {
        throw new Error("not called");
      },
      async create() {
        throw new Error("not used");
      },
      async listByUser() {
        return [];
      },
      async setStatus() {},
    };
    const automation: AutomationServices = {
      registry: {
        get: () => {
          throw new Error("registry.get should not be called");
        },
        has: () => true,
        register: () => {},
        list: () => [],
      },
      userScheduledJobRepo: userRepo,
      scheduledJobExecutionRepo: repo,
      async findDueJobs() {
        return { jobs: [], now: new Date() };
      },
      async dispatchDueJobs() {
        return { found: 0, dispatched: 0, skipped: 0, failed: 0, durationMs: 0 };
      },
      async markExecutionResult() {},
      async attachAgentRunToExecution() {},
      listExecutors() {
        return [];
      },
    };
    const handler = makeScheduledJobDispatchHandler({
      automation,
      userScheduledJobRepo: userRepo,
      scheduledJobExecutionRepo: repo,
      logger: noopLogger,
      now: () => new Date(),
    });
    await handler(makeJob());
    expect(calls).toEqual([]);
  });
});
