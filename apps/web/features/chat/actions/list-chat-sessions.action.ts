"use server";

import { db } from "@openbulls/db/client";
import { chatSessions } from "@openbulls/db/schema/ai.schema";
import { desc, eq } from "drizzle-orm";

import { getSessionUser } from "@/lib/auth";
import type { ChatSession } from "../schemas/chat-session.schema";

/**
 * List the current user's chat sessions, newest first.
 *
 * Limit defaults to 50 so the sidebar paints fast; the schema
 * exposes `modelKey` so future model-switch UI can render the
 * per-session default without a join.
 */
export async function listChatSessions(): Promise<ReadonlyArray<ChatSession>> {
  const user = await getSessionUser();
  if (!user) return [];

  const rows = await db
    .select({
      id: chatSessions.id,
      title: chatSessions.title,
      modelKey: chatSessions.modelKey,
      createdAt: chatSessions.createdAt,
      updatedAt: chatSessions.updatedAt,
    })
    .from(chatSessions)
    .where(eq(chatSessions.userId, user.id))
    .orderBy(desc(chatSessions.updatedAt))
    .limit(50);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    modelKey: r.modelKey,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}
