import { and, desc, eq } from "drizzle-orm";

import type { DB } from "../client";
import {
  agentGraphSnapshots,
  aiAgentRunSteps,
  aiAgentRuns,
  aiToolCalls,
  aiUsageEvents,
} from "../schema/ai.schema";
import type { AgentRunStatus } from "../schema/enums";
import type {
  CreateAgentRunInput,
  IAgentRunRepository,
  MarkStepFinishedInput,
  MarkToolCallFinishedInput,
  RecordAiUsageEventInput,
  RecordStepInput,
  RecordToolCallInput,
  SaveGraphSnapshotInput,
  UpdateAgentRunStatusInput,
} from "./agent-run.port";

/**
 * Drizzle implementation of `IAgentRunRepository`.
 *
 * Notes:
 * - Steps use ON CONFLICT DO NOTHING on the (run_id, node_key, attempt) unique
 *   index to make retries idempotent (recordStep may be called twice if the
 *   checkpoint replay path re-fires the same node).
 * - Graph snapshots use ON CONFLICT DO UPDATE on the (run_id, checkpoint_id)
 *   unique index so saving the same checkpoint id overwrites in place — this
 *   matches the way LangGraph-style checkpointers treat checkpoint ids as
 *   idempotent keys (same id = same logical state).
 */
export class DrizzleAgentRunRepository implements IAgentRunRepository {
  constructor(private readonly db: DB) {}

  // ─── Runs ──────────────────────────────────────────────────────────────────

  async create(input: CreateAgentRunInput) {
    const rows = await this.db
      .insert(aiAgentRuns)
      .values({
        userId: input.userId,
        graphKey: input.graphKey,
        threadId: input.threadId,
        status: "pending",
        input: input.input as object,
      })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error("failed to insert ai_agent_runs row");
    }
    return row;
  }

  getById(id: string) {
    return this.db.query.aiAgentRuns
      .findFirst({ where: eq(aiAgentRuns.id, id) })
      .then((r) => r ?? null);
  }

  async listByUser(userId: string, status?: AgentRunStatus) {
    const where = status
      ? and(eq(aiAgentRuns.userId, userId), eq(aiAgentRuns.status, status))
      : eq(aiAgentRuns.userId, userId);
    return this.db.query.aiAgentRuns.findMany({
      where,
      orderBy: [desc(aiAgentRuns.createdAt)],
    });
  }

  async updateStatus(input: UpdateAgentRunStatusInput): Promise<void> {
    await this.db
      .update(aiAgentRuns)
      .set({
        status: input.status,
        error: input.error,
        currentNodeKey: input.currentNodeKey,
        pausedAt: input.status === "paused" ? new Date() : undefined,
        completedAt:
          input.status === "completed" || input.status === "failed" ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(aiAgentRuns.id, input.id));
  }

  async complete(id: string, output: unknown): Promise<void> {
    await this.db
      .update(aiAgentRuns)
      .set({
        status: "completed",
        output: output as object,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(aiAgentRuns.id, id));
  }

  // ─── Steps ─────────────────────────────────────────────────────────────────

  async recordStep(input: RecordStepInput) {
    const rows = await this.db
      .insert(aiAgentRunSteps)
      .values({
        runId: input.runId,
        nodeKey: input.nodeKey,
        subagentKey: input.subagentKey ?? null,
        status: input.status,
        attempt: input.attempt ?? 1,
        inputSnapshot: (input.inputSnapshot ?? null) as object | null,
        outputSnapshot: null,
        error: input.error ?? null,
        startedAt: input.startedAt ?? new Date(),
        completedAt: input.completedAt ?? null,
      })
      .onConflictDoNothing({
        target: [aiAgentRunSteps.runId, aiAgentRunSteps.nodeKey, aiAgentRunSteps.attempt],
      })
      .returning();
    const row = rows[0];
    if (!row) {
      // Conflict on (runId, nodeKey, attempt) — fetch existing row.
      const existing = await this.db.query.aiAgentRunSteps.findFirst({
        where: and(
          eq(aiAgentRunSteps.runId, input.runId),
          eq(aiAgentRunSteps.nodeKey, input.nodeKey),
          eq(aiAgentRunSteps.attempt, input.attempt ?? 1),
        ),
      });
      if (!existing) {
        throw new Error("failed to insert or find ai_agent_run_steps row");
      }
      return existing;
    }
    return row;
  }

  async markStepFinished(input: MarkStepFinishedInput): Promise<void> {
    await this.db
      .update(aiAgentRunSteps)
      .set({
        status: input.status,
        outputSnapshot: (input.outputSnapshot ?? null) as object | null,
        error: input.error ?? null,
        completedAt: input.completedAt ?? new Date(),
      })
      .where(eq(aiAgentRunSteps.id, input.id));
  }

  listStepsByRun(runId: string) {
    return this.db.query.aiAgentRunSteps.findMany({
      where: eq(aiAgentRunSteps.runId, runId),
      orderBy: [aiAgentRunSteps.startedAt, aiAgentRunSteps.id],
    });
  }

  // ─── Tool Calls ────────────────────────────────────────────────────────────

  async recordToolCall(input: RecordToolCallInput) {
    const rows = await this.db
      .insert(aiToolCalls)
      .values({
        stepId: input.stepId,
        toolKey: input.toolKey,
        args: input.args as object,
        result: (input.result ?? null) as object | null,
        status: input.status,
        error: input.error ?? null,
        completedAt: input.completedAt ?? null,
      })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error("failed to insert ai_tool_calls row");
    }
    return row;
  }

  async markToolCallFinished(input: MarkToolCallFinishedInput): Promise<void> {
    await this.db
      .update(aiToolCalls)
      .set({
        status: input.status,
        result: (input.result ?? null) as object | null,
        error: input.error ?? null,
        completedAt: input.completedAt ?? new Date(),
      })
      .where(eq(aiToolCalls.id, input.id));
  }

  // ─── Usage Events ──────────────────────────────────────────────────────────

  async recordUsageEvent(input: RecordAiUsageEventInput) {
    const rows = await this.db
      .insert(aiUsageEvents)
      .values({
        userId: input.userId,
        runId: input.runId ?? null,
        stepId: input.stepId ?? null,
        modelKey: input.modelKey,
        provider: input.provider,
        inputTokens: input.inputTokens ?? 0,
        outputTokens: input.outputTokens ?? 0,
        latencyMs: input.latencyMs ?? null,
        rawUsage: (input.rawUsage ?? null) as object | null,
      })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error("failed to insert ai_usage_events row");
    }
    return row;
  }

  listUsageEventsByRun(runId: string) {
    return this.db.query.aiUsageEvents.findMany({
      where: eq(aiUsageEvents.runId, runId),
      orderBy: [desc(aiUsageEvents.occurredAt)],
    });
  }

  // ─── Graph Snapshots ───────────────────────────────────────────────────────

  async saveGraphSnapshot(input: SaveGraphSnapshotInput) {
    const rows = await this.db
      .insert(agentGraphSnapshots)
      .values({
        runId: input.runId,
        checkpointId: input.checkpointId,
        nodeKey: input.nodeKey,
        state: input.state as object,
        nextNodes: (input.nextNodes ?? null) as object | null,
      })
      .onConflictDoUpdate({
        target: [agentGraphSnapshots.runId, agentGraphSnapshots.checkpointId],
        set: {
          nodeKey: input.nodeKey,
          state: input.state as object,
          nextNodes: (input.nextNodes ?? null) as object | null,
        },
      })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error("failed to upsert agent_graph_snapshots row");
    }
    return row;
  }

  async loadLatestSnapshot(runId: string) {
    return this.db.query.agentGraphSnapshots
      .findFirst({
        where: eq(agentGraphSnapshots.runId, runId),
        orderBy: [desc(agentGraphSnapshots.createdAt)],
      })
      .then((r) => r ?? null);
  }

  listSnapshotsByRun(runId: string) {
    return this.db.query.agentGraphSnapshots.findMany({
      where: eq(agentGraphSnapshots.runId, runId),
      orderBy: [agentGraphSnapshots.createdAt, agentGraphSnapshots.id],
    });
  }
}
