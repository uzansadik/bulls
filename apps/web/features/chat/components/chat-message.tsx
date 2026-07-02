/**
 * apps/web — chat message renderer.
 *
 * Wraps `ai-elements`' `Message`/`MessageContent`/`MessageResponse`
 * to render one chat turn. We intentionally keep this thin so the
 * underlying primitives own the styling and we only add domain
 * specifics:
 *
 *   - Role-aware bubble styling (user → right, assistant → left)
 *   - Assistant messages stream through Streamdown for safe markdown
 *     + GFM rendering; user messages render plain text inside a
 *     bordered bubble.
 *
 * Tool-call rendering is deferred — see `tool-call-card.tsx`. When
 * the streaming parser grows `tool-*` event support, this component
 * will branch on `toolInvocations` and interleave tool cards between
 * text blocks.
 */
"use client";

import {
  Message,
  MessageContent,
  MessageResponse,
} from "@openbulls/ui/components/ai-elements/message";

import { cn } from "@openbulls/ui/lib/utils";

import type { ChatMessage as ChatMessageType } from "../schemas/chat-session.schema";

export interface ChatMessageProps {
  readonly message: ChatMessageType;
  readonly className?: string;
}

export function ChatMessage({ message, className }: ChatMessageProps) {
  const from = message.role === "user" ? "user" : "assistant";
  return (
    <Message className={className} from={from}>
      <MessageContent
        className={cn(
          message.role === "user"
            ? "rounded-2xl bg-primary px-4 py-3 text-primary-foreground"
            : "rounded-2xl bg-muted/40 px-4 py-3",
        )}
      >
        {message.role === "user" ? (
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        ) : (
          <MessageResponse>{message.content}</MessageResponse>
        )}
      </MessageContent>
    </Message>
  );
}

export type { ChatMessageType };
