/**
 * apps/web — chat tool call card.
 *
 * Renders one assistant tool invocation inline within a chat
 * message. Wraps `ai-elements`' `Tool`/`ToolHeader`/`ToolContent`/
 * `ToolInput`/`ToolOutput` so the chat surface picks up our tokens
 * (rounded borders, status pill, code block for the result) without
 * importing the underlying primitive directly.
 *
 * `state` mirrors the AI SDK v7 `ToolUIPart["state"]` lifecycle:
 *   - `input-available`        → model invoked the tool, awaiting
 *                                result
 *   - `output-available`       → tool returned a value
 *   - `output-error`           → tool threw
 *
 * In Faz 4 the chat wire format we parse only carries text deltas
 * and `finish` markers — tool calls do not currently propagate to
 * the client. This component ships now so `ChatMessage` can compose
 * it cleanly; the parser in `use-chat-model.ts` will grow
 * `tool-*` event handling in Faz 5 to fill the gap.
 */
"use client";

import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@openbulls/ui/components/ai-elements/tool";

import { cn } from "@openbulls/ui/lib/utils";

export type ToolCallState =
  | "input-available"
  | "input-streaming"
  | "output-available"
  | "output-error";

export interface ToolCallCardProps {
  readonly name: string;
  readonly state: ToolCallState;
  readonly input: unknown;
  readonly output?: unknown;
  readonly errorText?: string;
  readonly className?: string;
}

export function ToolCallCard({
  name,
  state,
  input,
  output,
  errorText,
  className,
}: ToolCallCardProps) {
  return (
    <Tool className={cn("not-prose mb-2 w-full", className)}>
      <ToolHeader state={state} title={name} type="dynamic-tool" toolName={name} />
      <ToolContent>
        <ToolInput input={input as never} />
        <ToolOutput errorText={errorText ?? undefined} output={(output ?? undefined) as never} />
      </ToolContent>
    </Tool>
  );
}
