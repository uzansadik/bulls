/**
 * @openbulls/automation — `dispatchDueJobs` command smoke tests.
 *
 * Full DB-mocked dispatch tests live in the integration suite (Faz 8
 * with pg-mem). Here we only cover the helper functions and the
 * happy-path shape so the public surface is exercised on every CI
 * run. Repository semantics are covered by `repositories.test.ts`.
 */
import { describe, expect, it } from "vitest";

import { InMemoryExecutorRegistry } from "../application";
import { findDueJobs } from "../application/find-due-jobs.query";
import { markExecutionResult } from "../application/mark-execution-result.command";
import { ExecutorInvalidPayloadError, type IExecutor } from "../domain";

import type { LoggerLike } from "@openbulls/logger";
import type { IScheduledJobExecutionRepository } from "../infrastructure/repositories/ports";

const noopLogger: LoggerLike = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

describe("dispatchDueJobs surface", () => {
  it("exists as a callable async function", async () => {
    const { dispatchDueJobs } = await import("../application/dispatch-due-jobs.command");
    expect(typeof dispatchDueJobs).toBe("function");
  });

  it("executor registry helpers", () => {
    const e: IExecutor = {
      type: "custom_agent",
      buildPayload: () => ({ graphKey: "x", input: {} }),
      run: async () => ({ kind: "agent-run", downstreamJobIds: [] }),
    };
    const r = new InMemoryExecutorRegistry();
    r.register(e);
    expect(r.has("custom_agent")).toBe(true);
    expect(r.list()).toHaveLength(1);
  });
});

describe("ExecutorInvalidPayloadError", () => {
  it("preserves the executor type + reason", () => {
    const err = new ExecutorInvalidPayloadError("bad payload", {
      executorType: "custom_agent",
      jobDefinitionKey: "j-1",
      reason: "graphKey missing",
    });
    expect(err.code).toBe("automation/executor-invalid-payload");
    expect(err.data.executorType).toBe("custom_agent");
    expect(err.data.reason).toBe("graphKey missing");
  });
});

describe("markExecutionResult", () => {
  it("requires reason for failed status", async () => {
    const calls: string[] = [];
    const repo: IScheduledJobExecutionRepository = {
      async createQueued() {
        throw new Error("not used");
      },
      async markRunning() {
        calls.push("running");
      },
      async markSucceeded() {
        calls.push("succeeded");
      },
      async markFailed(id, reason) {
        calls.push(`failed:${id}:${reason}`);
      },
      async markSkipped(id, reason) {
        calls.push(`skipped:${id}:${reason}`);
      },
      async attachAgentRun() {
        // not used
      },
      async getById() {
        return null;
      },
    };
    await expect(
      markExecutionResult({ repo }, { executionId: "exec-1", status: "failed" }),
    ).rejects.toThrow(/reason/);
    expect(calls).toEqual([]);
  });

  it("requires reason for skipped status", async () => {
    const repo: IScheduledJobExecutionRepository = {
      async createQueued() {
        throw new Error("not used");
      },
      async markRunning() {},
      async markSucceeded() {},
      async markFailed() {},
      async markSkipped() {},
      async attachAgentRun() {},
      async getById() {
        return null;
      },
    };
    await expect(
      markExecutionResult({ repo }, { executionId: "exec-1", status: "skipped" }),
    ).rejects.toThrow(/reason/);
  });
});

describe("findDueJobs (signature)", () => {
  it("exists as an async function with the right name", () => {
    expect(typeof findDueJobs).toBe("function");
    expect(findDueJobs.name).toBe("findDueJobs");
  });
});

void noopLogger;
