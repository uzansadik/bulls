/**
 * apps/web — chat agent-mode toggle.
 *
 * Quick chat (default) routes the user message through the
 * `/api/chat` streaming endpoint for a fast, single-step answer.
 *
 * Deep analysis flips the conversation into a long-running
 * LangGraph run via `enqueueAgentRun({ graphKey: "company-analysis" })`.
 * The graph runs in `apps/agent-worker` and the result lands back in
 * `chat_messages` once the subgraph finishes. The toggle lives at
 * the bottom of the prompt input so the choice is per-message, not
 * per-session.
 *
 * Faz 4 keeps this a UI affordance only — the deep path is wired in
 * a later Faz; for now it shows a notification that the action is
 * queued and is a no-op against `/api/chat`. We still surface the
 * control so design + UX feedback can land before the backend hook
 * is finished.
 */
"use client";

import { useState } from "react";

import { cn } from "@openbulls/ui/lib/utils";

export type AgentMode = "quick" | "deep";

export interface AgentModeToggleProps {
  readonly value: AgentMode;
  readonly onChange: (next: AgentMode) => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

export function AgentModeToggle({ value, onChange, disabled, className }: AgentModeToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center overflow-hidden rounded-md border bg-background text-xs",
        className,
      )}
      // biome-ignore lint/a11y/useSemanticElements: fieldset is for
      // form controls; this is a visual toggle group, not a form
      // group, so the ARIA role is the correct primitive.
      role="group"
    >
      <ToggleButton
        active={value === "quick"}
        disabled={disabled}
        label="Hızlı"
        onClick={() => onChange("quick")}
      />
      <ToggleButton
        active={value === "deep"}
        disabled={disabled}
        label="Derin analiz"
        onClick={() => onChange("deep")}
      />
    </div>
  );
}

export function useAgentMode(initial: AgentMode = "quick"): {
  readonly mode: AgentMode;
  readonly setMode: (next: AgentMode) => void;
} {
  const [mode, setMode] = useState<AgentMode>(initial);
  return { mode, setMode };
}

interface ToggleButtonProps {
  readonly active: boolean;
  readonly label: string;
  readonly disabled?: boolean;
  readonly onClick: () => void;
}

function ToggleButton({ active, label, disabled, onClick }: ToggleButtonProps) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "px-3 py-1.5 transition",
        active
          ? "bg-primary font-medium text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        disabled ? "cursor-not-allowed opacity-50" : "",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
