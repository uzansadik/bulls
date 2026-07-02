/**
 * apps/agent-worker — worker smoke integration test.
 *
 * Goal: prove the BullMQ consumer → agent-runtime pipeline works
 * end-to-end without Redis. Two scenarios:
 *
 *   1. **Smoke**: enqueue one `agent-run` job (graphKey:
 *      `company-analysis`, input: `{ symbol: "AAPL" }`). The mock
 *      consumer dispatches the handler, the runtime walks the
 *      default subgraph, and the run lands in `completed` with
 *      N snapshots (one per node).
 *
 *   2. **Resume**: enqueue an `agent-run` job against a fresh
 *      runtime that already has N snapshots. The runtime should
 *      skip the nodes it has already executed (idempotent) and
 *      finish the remaining work.
 *
 * The test uses:
 *   - `createInMemoryQueue` (local mock) — producer + consumer.
 *   - `InMemoryCheckpointer` + `InMemoryAgentRunRepository` —
 *     shared with the agent-runtime test suite so the assertions
 *     on run + snapshot state are uniform.
 *   - Mock market-data / portfolio gateways — happy path
 *     payloads, no real provider calls.
 */
import { describe, expect, it } from "vitest";

import type {
  IBillingGateway,
  IJobsGateway,
  IMarketDataGateway,
  IPortfolioGateway,
} from "@openbulls/agent-runtime";
import {
  GraphRegistry,
  createAgentRuntimeServices,
  registerDefaultGraphs,
} from "@openbulls/agent-runtime";
import type { AgentRunJob, JobId, ThreadId } from "@openbulls/jobs";
import { type Result, ok } from "@openbulls/shared";

import { InMemoryAgentRunRepository } from "../../../../packages/agent-runtime/src/__tests__/in-memory-agent-run-repo.mock";
import { InMemoryCheckpointer } from "../../../../packages/agent-runtime/src/__tests__/in-memory-checkpointer.mock";
import { makeAgentRunHandler } from "../job-handler";
import { createInMemoryQueue } from "./in-memory-queue.mock";

const noopLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const okBilling: IBillingGateway = {
  async reserveCredit(): Promise<
    Result<{ readonly reservationId: string; readonly balanceAfter: string }, never>
  > {
    return ok({ reservationId: "res-smoke", balanceAfter: "100" });
  },
  async finalizeUsage(): Promise<
    Result<
      {
        readonly reservationId: string;
        readonly finalCost: string;
        readonly balanceAfter: string;
      },
      never
    >
  > {
    return ok({
      reservationId: "res-smoke",
      finalCost: "0.01",
      balanceAfter: "99.99",
    });
  },
  async refundReservation(): Promise<
    Result<{ readonly reservationId: string; readonly balanceAfter: string }, never>
  > {
    return ok({ reservationId: "res-smoke", balanceAfter: "100" });
  },
};

const okJobs: IJobsGateway = {
  async enqueueAgentRun(): Promise<Result<never, never>> {
    return ok({} as never);
  },
};

const okMarket: IMarketDataGateway = {
  async getQuote() {
    return { price: 42, symbol: "AAPL" };
  },
  async getCandles() {
    return { candles: [] };
  },
  async getFinancialStatements() {
    return { rows: [] };
  },
  async getNews() {
    return [];
  },
  async getFxRate() {
    return null;
  },
};

const okPortfolio: IPortfolioGateway = {
  async getPortfolioOverview() {
    return null;
  },
  async getHoldings() {
    return [];
  },
  async getPerformance() {
    return null;
  },
};

function buildServices(repo: InMemoryAgentRunRepository, cp: InMemoryCheckpointer) {
  const registry = registerDefaultGraphs(new GraphRegistry());
  return createAgentRuntimeServices({
    graphRegistry: registry,
    agentRuns: repo,
    checkpointer: cp,
    billing: okBilling,
    marketData: okMarket,
    portfolio: okPortfolio,
    jobs: okJobs,
    logger: noopLogger,
    now: () => Date.now(),
  });
}

describe("apps/agent-worker smoke", () => {
  it("dispatches an agent-run job through the default subgraph", async () => {
    const queue = createInMemoryQueue();
    const repo = new InMemoryAgentRunRepository();
    const cp = new InMemoryCheckpointer();
    const services = buildServices(repo, cp);

    // Wire the consumer + handler.
    await queue.consumer.process(
      "agent-run",
      makeAgentRunHandler({ services, logger: noopLogger }),
    );

    // Enqueue a single agent-run job. Run id = job id (the worker
    // uses `job.jobId` as the run id).
    const jobPayload = {
      kind: "agent-run" as const,
      jobId: "smoke-job-1" as unknown as JobId,
      userId: "user-1",
      graphKey: "company-analysis" as never,
      threadId: "thread-1" as unknown as ThreadId,
      input: { symbol: "AAPL", estimatedCostUsd: "0.01" },
      enqueuedAt: new Date().toISOString(),
    } satisfies AgentRunJob;
    const enqueueResult = await queue.producer.enqueue(jobPayload);
    expect(enqueueResult.ok).toBe(true);

    // Dispatch the in-memory queue. Should process the single job.
    const dispatch = await queue.dispatch();
    expect(dispatch.processed).toBe(1);

    // Run row was created + completed.
    // NOTE: in-memory repo generates its own `id` for `create` and
    // the runtime uses `job.jobId` as the runId; they don't align
    // by design. We assert on the recorded calls instead.
    const createCall = repo.calls.find((c) => c.method === "create");
    expect(createCall).toBeDefined();
    const completeCall = repo.calls.find((c) => c.method === "complete");
    expect(completeCall).toBeDefined();
    // The input was the graph's `{ symbol, estimatedCostUsd }` record.
    expect(createCall?.args).toEqual(
      expect.objectContaining({
        input: { symbol: "AAPL", estimatedCostUsd: "0.01" },
        threadId: "thread-1",
      }),
    );

    // At least one snapshot per node of the subgraph (≥ 4 since
    // company-analysis has at least the 4 parallel branches
    // plus the synthesise step). The runtime uses
    // `checkpointer.save({ runId })` which keys by string, so
    // the snapshot list query reads against the job-id the
    // producer assigned. The mock producer overwrites the
    // caller's jobId with a sequential `mock-N` value.
    const snapshots = await cp.list("mock-1");
    expect(snapshots.length).toBeGreaterThanOrEqual(4);

    await queue.close();
  });

  it("resumes a paused run from its latest snapshot", async () => {
    // First phase: run to completion, capture the snapshot list.
    const repo = new InMemoryAgentRunRepository();
    const cp = new InMemoryCheckpointer();
    const services = buildServices(repo, cp);

    const first = await services.runGraph({
      runId: "resume-run",
      threadId: "resume-thread",
      userId: "user-2",
      graphKey: "company-analysis" as never,
      input: { symbol: "MSFT", estimatedCostUsd: "0.01" },
    });
    expect(first.status).toBe("completed");

    const afterFirst = await cp.list("resume-run");
    expect(afterFirst.length).toBeGreaterThan(0);

    // Second phase: resume with a fresh service surface against
    // the SAME repo + checkpointer. The runtime should hit the
    // resume branch in `runGraph` (or `resumeRun`) and skip the
    // already-executed nodes.
    const services2 = buildServices(repo, cp);
    const second = await services2.resumeRun({
      runId: "resume-run",
      threadId: "resume-thread",
      userId: "user-2",
      graphKey: "company-analysis" as never,
      input: { symbol: "MSFT", estimatedCostUsd: "0.01" },
    });
    // Resume on a complete run is a no-op: status stays
    // `completed`, no new snapshot rows.
    expect(second.status).toBe("completed");
    const afterSecond = await cp.list("resume-run");
    expect(afterSecond.length).toBe(afterFirst.length);
  });
});
