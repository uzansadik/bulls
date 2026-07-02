/**
 * apps/web — chat shell placeholder (Commit 5).
 *
 * The full chat UI (Conversation, Message, ModelSelector, ToolCallCard,
 * SourcesList, PromptInput) lands in Commit 6. For Commit 5 we mount
 * the streaming hook so the route + actions + server-side wiring are
 * exercisable end-to-end. Commit 6 replaces this body with the real
 * ai-elements-driven shell.
 */
"use client";

import { useChatModel } from "../hooks/use-chat-model";
import type { ChatMessage, ChatSession } from "../schemas/chat-session.schema";

export interface ChatShellProps {
  readonly session: ChatSession;
  readonly initialMessages: ReadonlyArray<ChatMessage>;
  readonly locale?: string;
}

export function ChatShell({ session, locale }: ChatShellProps) {
  const chat = useChatModel({ session, ...(locale !== undefined ? { locale } : {}) });
  void chat;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-10">
      <header>
        <h1 className="font-semibold text-2xl tracking-tight">
          {session.title ?? "Başlıksız sohbet"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Commit 6 — tam sohbet UI'sı (mesaj listesi, model seçici, prompt input) eklenecek.
        </p>
      </header>
      <pre className="overflow-auto rounded-lg border bg-card p-4 text-xs">
        {JSON.stringify({ sessionId: session.id, messagesCount: 0 }, null, 2)}
      </pre>
    </div>
  );
}
