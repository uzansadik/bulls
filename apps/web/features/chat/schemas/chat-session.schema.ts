/**
 * Chat session payload schema (client ↔ server contract).
 *
 * The server owns the truth (DB rows). This schema validates the
 * shape we serialise back to the client — id is non-optional, model
 * key is optional (session may predate model selection), title is
 * nullable (LLM-generated later).
 */
import { z } from "zod";

export const chatSessionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().nullable(),
  modelKey: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ChatSession = z.infer<typeof chatSessionSchema>;

export const chatMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.string(),
  toolCalls: z.array(z.unknown()).nullable(),
  createdAt: z.string(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
