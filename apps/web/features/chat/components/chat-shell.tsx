/**
 * apps/web — chat shell (client root).
 *
 * Composition root for the live chat surface. The server component
 * (`/[locale]/(dashboard)/chat/[sessionId]/page.tsx`) loads the
 * initial session + messages from the DB and hands them here; this
 * client component owns:
 *
 *   - `useChatModel` — streaming state (messages, isLoading, stop,
 *     reload) bound to the `/api/chat` endpoint.
 *   - `Conversation` — sticky-to-bottom scroll region. The AI SDK's
 *     `useChat` would wire this; our hand-rolled hook does the same
 *     with `useEffect`-based scroll updates so we don't pull in
 *     `@ai-sdk/react`.
 *   - `SessionSidebar` — left rail with prior chats + new chat
 *     button.
 *   - `PromptInput` + `ModelSelector` + `AgentModeToggle` — composer
 *     row.
 *   - Error banner — surfaces fetch / stream errors to the user.
 *
 * When the user picks a new model in the URL search param the
 * `useChatModel` hook re-derives its `modelKey` on the next message;
 * we never re-mount the streaming fetch on a model switch — the
 * change just persists into the next `/api/chat` POST body.
 */
"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@openbulls/ui/components/ai-elements/conversation";
import { useEffect, useState } from "react";

import { listChatSessions } from "../actions/list-chat-sessions.action";
import { useChatModel } from "../hooks/use-chat-model";
import type { ChatMessage, ChatSession } from "../schemas/chat-session.schema";

import { AgentModeToggle, useAgentMode } from "./agent-mode-toggle";
import { ChatMessage as ChatMessageView } from "./chat-message";
import { ModelSelector } from "./model-selector";
import { PromptInput } from "./prompt-input";
import { SessionSidebar } from "./session-sidebar";

export interface ChatShellProps {
  readonly session: ChatSession;
  readonly initialMessages: ReadonlyArray<ChatMessage>;
  readonly locale: string;
  readonly modelKey: string;
}

export function ChatShell({ session, initialMessages, locale, modelKey }: ChatShellProps) {
  void initialMessages; // Reserved for Faz 5 — `useChatModel` will
  // consume these as its initial state. For now we always start an
  // empty stream and DB-persist on each turn.
  const chat = useChatModel({
    session,
    ...(locale !== undefined ? { locale } : {}),
  });
  const { mode } = useAgentMode("quick");
  void mode;

  // We only render messages that have non-empty content so the
  // placeholder assistant message emitted by `useChatModel` doesn't
  // paint an empty bubble while the first stream chunk arrives.
  const visible = chat.messages.filter(
    (m) => m.content.length > 0 || m.id !== chat.messages.at(-1)?.id,
  );

  // `Conversation` (stick-to-bottom) owns its own auto-scroll on
  // mount + content change. No manual scroll plumbing needed.

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full">
      <div className="hidden w-72 shrink-0 md:block">
        <SidebarWithSessions activeSessionId={session.id} locale={locale} />
      </div>
      <main className="flex flex-1 flex-col">
        <Conversation className="flex-1">
          <ConversationContent>
            {visible.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm">
                Merhaba! Finans sorularınızı sormaya başlayabilirsiniz.
              </p>
            ) : (
              visible.map((m) => <ChatMessageView key={m.id} message={m} />)
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="space-y-2 border-t bg-background/70 p-3 backdrop-blur">
          {chat.error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-xs">
              {chat.error}
            </p>
          ) : null}
          <PromptInput chat={chat} />
          <div className="flex items-center justify-between text-xs">
            <AgentModeToggle disabled={chat.isLoading} onChange={() => undefined} value="quick" />
            <ModelSelector locale={locale} value={modelKey} />
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Thin wrapper that fetches the session list once on mount and
 * feeds it into `SessionSidebar`. Lives here rather than in the
 * page so the server component stays pure.
 */
function SidebarWithSessions({
  activeSessionId,
  locale,
}: {
  readonly activeSessionId: string;
  readonly locale: string;
}) {
  const [sessions, setSessions] = useState<ReadonlyArray<ChatSession>>([]);
  useEffect(() => {
    void listChatSessions().then(setSessions);
  }, []);
  return <SessionSidebar activeSessionId={activeSessionId} locale={locale} sessions={sessions} />;
}
