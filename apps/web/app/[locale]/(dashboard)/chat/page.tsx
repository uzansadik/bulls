/**
 * apps/web — chat landing page.
 *
 * Server component — auth-gated by the surrounding `(dashboard)`
 * layout. Lists the user's chat sessions and renders a "new chat"
 * CTA. Selecting a session pushes to
 * `/[locale]/dashboard/chat/[sessionId]`.
 */
import Link from "next/link";
import { redirect } from "next/navigation";

import { createChatSession } from "@/features/chat/actions/create-chat-session.action";
import { listChatSessions } from "@/features/chat/actions/list-chat-sessions.action";

export const dynamic = "force-dynamic";

async function startNewChat(locale: string): Promise<void> {
  "use server";
  const created = await createChatSession({});
  if (!created) return;
  redirect(`/${locale}/dashboard/chat/${created.id}`);
}

export default async function ChatIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const sessions = await listChatSessions();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Sohbetler</h1>
          <p className="text-muted-foreground text-sm">
            Openbulls asistanıyla finans sorularınızı sohbet edin. Uzun analizler için "Derin
            analiz" modunu kullanın.
          </p>
        </div>
        <form
          action={async () => {
            await startNewChat(locale);
          }}
        >
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:opacity-90"
          >
            Yeni sohbet
          </button>
        </form>
      </header>

      <ul className="grid gap-2">
        {sessions.length === 0 ? (
          <li className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
            Henüz bir sohbet yok. Yukarıdan yeni bir tane başlatın.
          </li>
        ) : (
          sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/${locale}/dashboard/chat/${s.id}`}
                className="block rounded-lg border bg-card p-4 transition hover:bg-accent/50"
              >
                <p className="font-medium">{s.title ?? "Başlıksız sohbet"}</p>
                <p className="text-muted-foreground text-xs">
                  {new Date(s.updatedAt).toLocaleString("tr-TR")}
                </p>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
