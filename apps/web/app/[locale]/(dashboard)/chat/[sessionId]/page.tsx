/**
 * apps/web — single chat session page.
 *
 * Server component — auth-gated, looks up the session by id and
 * passes it (plus the initial messages) into a client component
 * that wires `useChatModel`. The client component is the source of
 * truth for the live conversation; this server component only
 * hydrates the initial state.
 */
import { notFound } from "next/navigation";

import { getChatSession } from "@/features/chat/actions/get-chat-session.action";
import { ChatShell } from "@/features/chat/components/chat-shell";

export const dynamic = "force-dynamic";

export default async function ChatSessionPage({
  params,
}: {
  params: Promise<{ locale: string; sessionId: string }>;
}) {
  const { sessionId, locale } = await params;
  const data = await getChatSession(sessionId);
  if (!data) notFound();

  return <ChatShell session={data.session} initialMessages={data.messages} locale={locale} />;
}
