"use server";

import { db } from "@openbulls/db/client";
import { chatSessions } from "@openbulls/db/schema/ai.schema";
import { and, eq, sql } from "drizzle-orm";

import { getSessionUser } from "@/lib/auth";

export interface CreateChatSessionInput {
  readonly modelKey?: string;
  readonly title?: string;
}

/**
 * Create a fresh chat session for the current user.
 *
 * The session starts without a title; a follow-up `updateChatTitle`
 * action sets it once the first user message is sent (LLM-generated
 * summary, deferred to Faz 5 — until then we use the raw first
 * message trimmed to 64 chars).
 */
export async function createChatSession(
  input: CreateChatSessionInput = {},
): Promise<{ id: string } | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const inserted = await db
    .insert(chatSessions)
    .values({
      userId: user.id,
      ...(input.modelKey !== undefined ? { modelKey: input.modelKey } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
    })
    .returning({ id: chatSessions.id });

  const row = inserted[0];
  if (!row) return null;
  return { id: row.id };
}

/**
 * Update a session's title — called from the chat shell when the
 * user sends the first message. `null` clears the title.
 *
 * The drizzle update result type doesn't expose `rowCount` for
 * postgres-js — we use `.returning({ id })` so the length of the
 * returned array is the rowCount equivalent.
 */
export async function updateChatTitle(sessionId: string, title: string | null): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;
  const trimmed = title === null ? null : title.trim().slice(0, 120);
  const updated = await db
    .update(chatSessions)
    .set({ title: trimmed, updatedAt: sql`now()` })
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, user.id)))
    .returning({ id: chatSessions.id });
  return updated.length > 0;
}
