/**
 * @openbulls/reports — Drizzle report repository.
 *
 * Direct mapping to the \`reports\` table; Drizzle row types flow
 * back to the application layer unchanged. No relations joined
 * today — \`parameters\` is JSONB and stored opaquely.
 */
import { and, desc, eq, sql } from "drizzle-orm";

import type { DatabaseOrTx } from "@openbulls/db/client";
import { type Report, reports } from "@openbulls/db/schema/reports.schema";

import { ReportRepositoryError } from "../../domain";
import type {
  IReportRepository,
  ListByUserOptions,
  NewReportInput,
} from "./ports";

export class DrizzleReportRepository implements IReportRepository {
  readonly #db: DatabaseOrTx;

  constructor(db: DatabaseOrTx) {
    this.#db = db;
  }

  async insert(input: NewReportInput): Promise<Report> {
    try {
      const [row] = await this.#db
        .insert(reports)
        .values({
          userId: input.userId,
          reportType: input.reportType,
          format: input.format,
          title: input.title,
          parameters: input.parameters,
          status: input.status,
          ...(input.portfolioId ? { portfolioId: input.portfolioId } : {}),
        })
        .returning();
      if (!row) {
        throw new ReportRepositoryError(
          "insert returned no row",
          { operation: "insert" },
        );
      }
      return row;
    } catch (err) {
      throw new ReportRepositoryError(
        `insert failed: ${(err as Error).message}`,
        { operation: "insert", cause: String(err) },
      );
    }
  }

  async getById(id: string): Promise<Report | null> {
    try {
      const [row] = await this.#db
        .select()
        .from(reports)
        .where(eq(reports.id, id))
        .limit(1);
      return row ?? null;
    } catch (err) {
      throw new ReportRepositoryError(
        `getById failed: ${(err as Error).message}`,
        { operation: "getById", cause: String(err) },
      );
    }
  }

  async listByUser(
    userId: string,
    options: ListByUserOptions = {},
  ): Promise<readonly Report[]> {
    try {
      const conds = [eq(reports.userId, userId)];
      if (options.status) conds.push(eq(reports.status, options.status));
      const rows = await this.#db
        .select()
        .from(reports)
        .where(conds.length > 1 ? and(...conds) : conds[0])
        .orderBy(desc(reports.createdAt))
        .limit(options.limit ?? 25);
      return rows;
    } catch (err) {
      throw new ReportRepositoryError(
        `listByUser failed: ${(err as Error).message}`,
        { operation: "listByUser", cause: String(err) },
      );
    }
  }

  async markGenerating(id: string): Promise<Report> {
    try {
      const [row] = await this.#db
        .update(reports)
        .set({ status: "generating" })
        .where(eq(reports.id, id))
        .returning();
      if (!row) {
        throw new ReportRepositoryError(
          `markGenerating: report not found: ${id}`,
          { operation: "markGenerating" },
        );
      }
      return row;
    } catch (err) {
      throw new ReportRepositoryError(
        `markGenerating failed: ${(err as Error).message}`,
        { operation: "markGenerating", cause: String(err) },
      );
    }
  }

  async markReady(id: string, storageKey: string, sizeBytes: number): Promise<Report> {
    try {
      const [row] = await this.#db
        .update(reports)
        .set({
          status: "ready",
          storageKey,
          generatedAt: new Date(),
        })
        .where(eq(reports.id, id))
        .returning();
      if (!row) {
        throw new ReportRepositoryError(
          `markReady: report not found: ${id}`,
          { operation: "markReady" },
        );
      }
      // size is informational — schema doesn't have a size column,
      // so we silently drop. A future migration (Faz 8) adds
      // \`size_bytes int8\` and we update this.
      void sizeBytes;
      return row;
    } catch (err) {
      throw new ReportRepositoryError(
        `markReady failed: ${(err as Error).message}`,
        { operation: "markReady", cause: String(err) },
      );
    }
  }

  async markFailed(id: string, reason: string): Promise<Report> {
    try {
      const [row] = await this.#db
        .update(reports)
        .set({
          status: "failed",
          error: reason.slice(0, 2_000),
        })
        .where(eq(reports.id, id))
        .returning();
      if (!row) {
        throw new ReportRepositoryError(
          `markFailed: report not found: ${id}`,
          { operation: "markFailed" },
        );
      }
      return row;
    } catch (err) {
      throw new ReportRepositoryError(
        `markFailed failed: ${(err as Error).message}`,
        { operation: "markFailed", cause: String(err) },
      );
    }
  }
}

/**
 * Helper to count rows for a user+status (used by integration tests
 * and Faz 8's admin UI). Not part of the public port; ad-hoc
 * consumers reach in via this exported function.
 */
export async function countByUserAndStatus(
  db: DatabaseOrTx,
  userId: string,
  status: "pending" | "generating" | "ready" | "failed",
): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(reports)
    .where(and(eq(reports.userId, userId), eq(reports.status, status)));
  return row?.n ?? 0;
}