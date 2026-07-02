/**
 * apps/web — chat prompt input.
 *
 * Single-line composer for the chat surface. We don't reuse
 * `ai-elements`' `PromptInput` here because that primitive is built
 * around the `@ai-sdk/react` `useChat` shape — attachment lists,
 * provider controllers, dropdown menus — most of which the chat
 * doesn't need yet.
 *
 * Our implementation is intentionally tiny:
 *   - controlled `<textarea>` driven by `useChatModel`'s
 *     `input`/`setInput`
 *   - Enter submits, Shift+Enter inserts a newline
 *   - Submit is disabled while a stream is in flight
 *   - A small stop button (`SquareIcon`) replaces the send icon when
 *     `isLoading` so the user can abort a long generation
 *
 * The model selector and agent-mode toggle render as siblings of
 * this component in `chat-shell.tsx`; we keep them separate so each
 * remains independently composable.
 */
"use client";

import { CornerDownLeftIcon, SquareIcon } from "lucide-react";
import { type KeyboardEvent, useRef } from "react";

import { cn } from "@openbulls/ui/lib/utils";

import type { useChatModel } from "../hooks/use-chat-model";

export interface PromptInputProps {
  readonly chat: Pick<
    ReturnType<typeof useChatModel>,
    "input" | "setInput" | "submit" | "isLoading" | "stop"
  >;
  readonly placeholder?: string;
  readonly className?: string;
}

export function PromptInput({
  chat,
  placeholder = "Finans sorunuzu yazın…",
  className,
}: PromptInputProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const text = chat.input.trim();
    if (text.length === 0 || chat.isLoading) return;
    void chat.submit(text);
    if (ref.current) ref.current.value = "";
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const text = chat.input.trim();
      if (text.length === 0 || chat.isLoading) return;
      void chat.submit(text);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <form
      className={cn(
        "flex items-end gap-2 rounded-2xl border bg-background px-3 py-2 shadow-sm",
        className,
      )}
      onSubmit={handleSubmit}
    >
      <textarea
        aria-label={placeholder}
        className="field-sizing-content min-h-10 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        disabled={chat.isLoading}
        onChange={(e) => chat.setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        ref={ref}
        rows={1}
        value={chat.input}
      />
      <button
        aria-label={chat.isLoading ? "Durdur" : "Gönder"}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition",
          chat.isLoading
            ? "bg-destructive text-destructive-foreground hover:opacity-90"
            : "bg-primary text-primary-foreground hover:opacity-90",
          chat.input.trim().length === 0 && !chat.isLoading ? "cursor-not-allowed opacity-50" : "",
        )}
        disabled={chat.input.trim().length === 0 && !chat.isLoading}
        onClick={(e) => {
          if (chat.isLoading) {
            e.preventDefault();
            chat.stop();
          }
        }}
        type={chat.isLoading ? "button" : "submit"}
      >
        {chat.isLoading ? (
          <SquareIcon className="size-4" />
        ) : (
          <CornerDownLeftIcon className="size-4" />
        )}
      </button>
    </form>
  );
}
