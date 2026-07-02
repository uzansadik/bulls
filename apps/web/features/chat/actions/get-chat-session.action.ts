"use server";

import { db } from "@openbulls/db/client";
import { chatMessages, chatSessions } from "@openbulls/db/schema/ai.schema";
import { and, asc, eq } from "drizzle-orm";

import { getSessionUser } from "@/lib/auth";
import type { ChatMessage, ChatSession } from "../schemas/chat-session.schema";

export interface ChatSessionWithMessages {
  readonly session: ChatSession;
  readonly messages: ReadonlyArray<ChatMessage>;
}

/**
 * Fetch a single chat session + its messages.
 *
 * Scoped to the current user — even if a stranger guesses the UUID,
 * the WHERE clause returns zero rows. Returns `null` when the
 * session doesn't exist OR doesn't belong to the caller; we don't
 * leak which of the two it was.
 */
export async function getChatSession(sessionId: string): Promise<ChatSessionWithMessages | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const sessionRows = await db
    .select({
      id: chatSessions.id,
      title: chatSessions.title,
      modelKey: chatSessions.modelKey,
      createdAt: chatSessions.createdAt,
      updatedAt: chatSessions.updatedAt,
    })
    .from(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, user.id)))
    .limit(1);

  const session = sessionRows[0];
  if (!session) return null;

  const messageRows = await db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      toolCalls: chatMessages.toolCalls,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, session.id))
    .orderBy(asc(chatMessages.createdAt))
    .limit(500);

  const messages: ChatMessage[] = messageRows.map((r) => ({
    id: r.id,
    role: r.role,
    content: r.content,
    toolCalls: Array.isArray(r.toolCalls)
      ? ([...r.toolCalls] as unknown[])
      : r.toolCalls === null
        ? null
        : null,
    createdAt: r.createdAt.toISOString(),
  }));

  return {
    session: {
      id: session.id,
      title: session.title,
      modelKey: session.modelKey,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    },
    messages,
  };
}
