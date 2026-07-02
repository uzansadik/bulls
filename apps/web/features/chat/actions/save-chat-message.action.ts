"use server";

import { db } from "@openbulls/db/client";
import { chatMessages, chatSessions } from "@openbulls/db/schema/ai.schema";
import { and, eq, sql } from "drizzle-orm";

import { getSessionUser } from "@/lib/auth";

export type ChatRole = "user" | "assistant" | "system" | "tool";

export interface SaveChatMessageInput {
  readonly sessionId: string;
  readonly role: ChatRole;
  readonly content: string;
  readonly toolCalls?: ReadonlyArray<unknown>;
  readonly toolCallId?: string;
}

/**
 * Persist a single chat message.
 *
 * We also touch the owning `chat_sessions.updatedAt` so the sidebar
 * list keeps its newest-first ordering. The ownership check lives
 * inside the same UPDATE — a stranger's session UUID returns 0
 * rows affected and we surface that as a `false` so the caller can
 * skip the optimistic UI update.
 */
export async function saveChatMessage(input: SaveChatMessageInput): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;

  const values = {
    sessionId: input.sessionId,
    role: input.role,
    content: input.content,
    ...(input.toolCalls !== undefined ? { toolCalls: input.toolCalls as never } : {}),
    ...(input.toolCallId !== undefined ? { toolCallId: input.toolCallId } : {}),
  };

  await db.insert(chatMessages).values(values);

  // Bump the session timestamp via `returning({ id })` so we know
  // whether the session belongs to the current user.
  const touched = await db
    .update(chatSessions)
    .set({ updatedAt: sql`now()` })
    .where(and(eq(chatSessions.id, input.sessionId), eq(chatSessions.userId, user.id)))
    .returning({ id: chatSessions.id });
  return touched.length > 0;
}
