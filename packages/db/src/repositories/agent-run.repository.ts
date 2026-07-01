import { and, desc, eq } from "drizzle-orm";

import type { DB } from "../client";
import { aiAgentRuns } from "../schema/ai.schema";
import type { AgentRunStatus } from "../schema/enums";
import type {
  CreateAgentRunInput,
  IAgentRunRepository,
  UpdateAgentRunStatusInput,
} from "./agent-run.port";

export class DrizzleAgentRunRepository implements IAgentRunRepository {
  constructor(private readonly db: DB) {}

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
}
