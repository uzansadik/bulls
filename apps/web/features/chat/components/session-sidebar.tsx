/**
 * apps/web — chat session sidebar.
 *
 * Client component for the left rail of the chat surface. Renders the
 * current user's sessions in newest-first order with a "new chat"
 * button that calls the server action `createChatSession` and
 * navigates to the resulting session URL. Active session gets a
 * subtle highlight so the user can orient themselves inside long
 * histories.
 */
"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { createChatSession } from "../actions/create-chat-session.action";
import type { ChatSession } from "../schemas/chat-session.schema";

export interface SessionSidebarProps {
  readonly sessions: ReadonlyArray<ChatSession>;
  readonly locale: string;
  readonly activeSessionId?: string;
}

export function SessionSidebar({ sessions, locale, activeSessionId }: SessionSidebarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleNew = (): void => {
    startTransition(async () => {
      const created = await createChatSession({});
      if (!created) return;
      router.push(`/${locale}/dashboard/chat/${created.id}`);
    });
  };

  return (
    <aside className="flex h-full w-full flex-col gap-3 border-r bg-card/30 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm tracking-wide">Sohbetler</h2>
        <button
          className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-xs hover:opacity-90 disabled:opacity-60"
          disabled={isPending}
          onClick={handleNew}
          type="button"
        >
          {isPending ? "Oluşturuluyor…" : "Yeni"}
        </button>
      </div>
      <ul className="flex flex-col gap-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <li className="rounded-md border border-dashed p-3 text-center text-muted-foreground text-xs">
            Henüz sohbet yok.
          </li>
        ) : (
          sessions.map((s) => {
            const isActive = s.id === activeSessionId;
            return (
              <li key={s.id}>
                <a
                  className={`block truncate rounded-md px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                  href={`/${locale}/dashboard/chat/${s.id}`}
                  title={s.title ?? "Başlıksız sohbet"}
                >
                  {s.title ?? "Başlıksız sohbet"}
                </a>
              </li>
            );
          })
        )}
      </ul>
    </aside>
  );
}
