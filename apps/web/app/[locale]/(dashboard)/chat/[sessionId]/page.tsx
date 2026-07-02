/**
 * apps/web — single chat session page.
 *
 * Server component — auth-gated, looks up the session by id and
 * passes it (plus the initial messages) into a client component
 * that wires `useChatModel`. The client component is the source of
 * truth for the live conversation; this server component only
 * hydrates the initial state.
 *
 * `modelKey` falls back to the per-session default (if any) or to
 * `DEFAULT_MODEL_KEY` if neither is set. The URL search param
 * `?model=<key>` wins so the picker in the shell can switch on the
 * fly.
 */
import { notFound } from "next/navigation";

import { DEFAULT_MODEL_KEY } from "@/app/api/chat/route";

import { getChatSession } from "@/features/chat/actions/get-chat-session.action";
import { ChatShell } from "@/features/chat/components/chat-shell";

export const dynamic = "force-dynamic";

export default async function ChatSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; sessionId: string }>;
  searchParams: Promise<{ model?: string }>;
}) {
  const { sessionId, locale } = await params;
  const { model: queryModel } = await searchParams;
  const data = await getChatSession(sessionId);
  if (!data) notFound();

  const modelKey = queryModel ?? data.session.modelKey ?? DEFAULT_MODEL_KEY;

  return (
    <ChatShell
      initialMessages={data.messages}
      locale={locale}
      modelKey={modelKey}
      session={data.session}
    />
  );
}
