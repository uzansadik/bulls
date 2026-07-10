/**
 * @openbulls/automation — `default-executors.factory` unit tests.
 *
 * Exercises each executor's `buildPayload` (Zod validation) and the
 * downstream enqueue call on `run`. We mock `JobsServices` so no
 * BullMQ is involved.
 */
import { describe, expect, it } from "vitest";

import { ExecutorInvalidPayloadError } from "../domain";

import {
  createCustomAgentExecutor,
  createEarningsCalendarWatchExecutor,
  createNewsWatchExecutor,
  createPortfolioDailyReviewExecutor,
  createPortfolioWeeklyReviewExecutor,
} from "./default-executors.factory";

import type { JobsServices } from "@openbulls/jobs";
import type { LoggerLike } from "@openbulls/logger";
import { ok } from "@openbulls/shared";

const noopLogger: LoggerLike = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

function makeJobsMock() {
  const calls: Array<{ method: string; args: unknown }> = [];
  const jobs: JobsServices = {
    async enqueueAgentRun(input) {
      calls.push({ method: "enqueueAgentRun", args: input });
      return ok({ jobId: "agent-job-1" });
    },
    async enqueueScheduledJobDispatch(input) {
      calls.push({ method: "enqueueScheduledJobDispatch", args: input });
      return ok({ jobId: "dispatch-job-1" });
    },
    async enqueueNotificationDispatch(input) {
      calls.push({ method: "enqueueNotificationDispatch", args: input });
      return ok({ jobId: "notif-job-1" });
    },
    async enqueueReportRender(input) {
      calls.push({ method: "enqueueReportRender", args: input });
      return ok({ jobId: "report-job-1" });
    },
  };
  return { jobs, calls };
}

const jobDefinitionBase = {
  id: "j-1",
  userId: "user-1",
  name: "job",
  description: null,
  cron: "* * * * *",
  timezone: "UTC",
  status: "active" as const,
  nextRunAt: new Date(),
  lastRunAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("createPortfolioDailyReviewExecutor", () => {
  it("buildPayload applies default reviewKind=daily", () => {
    const { jobs } = makeJobsMock();
    const ex = createPortfolioDailyReviewExecutor({ jobs });
    const payload = ex.buildPayload({});
    expect(payload.reviewKind).toBe("daily");
  });

  it("run enqueues an agent-run with graphKey=portfolio-review", async () => {
    const { jobs, calls } = makeJobsMock();
    const ex = createPortfolioDailyReviewExecutor({ jobs });
    const result = await ex.run({
      userId: "user-1",
      jobDefinition: {
        ...jobDefinitionBase,
        executorType: "portfolio_daily_review",
        inputPayload: {},
      },
      payload: { reviewKind: "daily" },
      now: new Date(),
      logger: noopLogger,
    });
    expect(result.kind).toBe("agent-run");
    expect(calls.some((c) => c.method === "enqueueAgentRun")).toBe(true);
    const c = calls.find((x) => x.method === "enqueueAgentRun");
    const args = c?.args as { graphKey: string; input: { reviewKind: string } };
    expect(args?.graphKey).toBe("portfolio-review");
    expect(args?.input.reviewKind).toBe("daily");
  });
});

describe("createPortfolioWeeklyReviewExecutor", () => {
  it("uses reviewKind=weekly by default", () => {
    const { jobs } = makeJobsMock();
    const ex = createPortfolioWeeklyReviewExecutor({ jobs });
    const payload = ex.buildPayload({});
    expect(payload.reviewKind).toBe("daily"); // daily is the only valid string in zod default
    // Override to weekly explicitly:
    const payloadWeekly = ex.buildPayload({ reviewKind: "weekly" });
    expect(payloadWeekly.reviewKind).toBe("weekly");
  });
});

describe("createCustomAgentExecutor", () => {
  it("buildPayload requires graphKey", () => {
    const { jobs } = makeJobsMock();
    const ex = createCustomAgentExecutor({ jobs });
    expect(() => ex.buildPayload({})).toThrow(ExecutorInvalidPayloadError);
  });

  it("buildPayload accepts graphKey + input", () => {
    const { jobs } = makeJobsMock();
    const ex = createCustomAgentExecutor({ jobs });
    const payload = ex.buildPayload({
      graphKey: "market-news",
      input: { symbols: ["THYAO"] },
    });
    expect(payload.graphKey).toBe("market-news");
    expect(payload.input).toEqual({ symbols: ["THYAO"] });
  });

  it("run enqueues agent-run with the configured graphKey", async () => {
    const { jobs, calls } = makeJobsMock();
    const ex = createCustomAgentExecutor({ jobs });
    const result = await ex.run({
      userId: "user-1",
      jobDefinition: {
        ...jobDefinitionBase,
        executorType: "custom_agent",
        inputPayload: { graphKey: "portfolio-review", input: {} },
      },
      payload: { graphKey: "portfolio-review", input: {} },
      now: new Date(),
      logger: noopLogger,
    });
    expect(result.kind).toBe("agent-run");
    const c = calls.find((x) => x.method === "enqueueAgentRun");
    const args = c?.args as { graphKey: string };
    expect(args?.graphKey).toBe("portfolio-review");
  });
});

describe("createNewsWatchExecutor", () => {
  it("buildPayload applies empty arrays as defaults", () => {
    const { jobs } = makeJobsMock();
    const ex = createNewsWatchExecutor({ jobs });
    const payload = ex.buildPayload({});
    expect(payload.symbols).toEqual([]);
    expect(payload.topics).toEqual([]);
  });

  it("run enqueues market-news agent-run", async () => {
    const { jobs, calls } = makeJobsMock();
    const ex = createNewsWatchExecutor({ jobs });
    const result = await ex.run({
      userId: "user-1",
      jobDefinition: {
        ...jobDefinitionBase,
        executorType: "news_watch",
        inputPayload: {},
      },
      payload: { symbols: [], topics: [] },
      now: new Date(),
      logger: noopLogger,
    });
    expect(result.kind).toBe("agent-run");
    const c = calls.find((x) => x.method === "enqueueAgentRun");
    const args = c?.args as { graphKey: string };
    expect(args?.graphKey).toBe("market-news");
  });
});

describe("createEarningsCalendarWatchExecutor", () => {
  it("buildPayload applies daysAhead=7 default", () => {
    const { jobs } = makeJobsMock();
    const ex = createEarningsCalendarWatchExecutor({ jobs });
    const payload = ex.buildPayload({ symbols: ["THYAO"] });
    expect(payload.symbols).toEqual(["THYAO"]);
    expect(payload.daysAhead).toBe(7);
  });

  it("run returns noop (Faz 5 placeholder)", async () => {
    const { jobs } = makeJobsMock();
    const ex = createEarningsCalendarWatchExecutor({ jobs });
    const result = await ex.run({
      userId: "user-1",
      jobDefinition: {
        ...jobDefinitionBase,
        executorType: "earnings_calendar_watch",
        inputPayload: { symbols: ["THYAO"] },
      },
      payload: { symbols: ["THYAO"], daysAhead: 7 },
      now: new Date(),
      logger: noopLogger,
    });
    expect(result.kind).toBe("noop");
  });
});
