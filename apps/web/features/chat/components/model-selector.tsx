/**
 * apps/web — chat model selector (client).
 *
 * Renders a dropdown of the available models — the list comes from
 * `@openbulls/ai`'s `listAvailableModels()` (server-safe; we inline
 * the static list at build time so the bundle stays small).
 *
 * Selecting a model updates the URL search param `?model=<key>` and
 * propagates upward via `onChange`. The chat shell reads the value
 * before firing the next message and passes it into `useChatModel`.
 *
 * We deliberately keep the selector a thin client component rather
 * than wiring it into `useChatModel` — model choice is per-message,
 * not per-hook-instance, and the search-param approach survives a
 * page reload.
 */
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { type ModelDescriptor, listAvailableModels } from "@openbulls/ai";

export interface ModelSelectorProps {
  readonly value: string;
  readonly locale: string;
  readonly models?: ReadonlyArray<ModelDescriptor>;
}

export function ModelSelector({ value, locale, models }: ModelSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Faz 4 keeps the model list static; Faz 5 will swap to a server
  // action fetch.
  const list = models ?? listAvailableModels();

  const handleChange = (next: string): void => {
    const search = new URLSearchParams(params?.toString() ?? "");
    if (next) search.set("model", next);
    else search.delete("model");
    const qs = search.toString();
    void router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">Model</span>
      <select
        aria-label="Model seçimi"
        className="rounded-md border bg-background px-2 py-1 text-xs"
        onChange={(e) => handleChange(e.target.value)}
        value={value}
      >
        {list.map((m) => (
          <option key={m.key} value={m.key}>
            {m.displayName}
          </option>
        ))}
      </select>
      <span className="sr-only">({locale})</span>
    </label>
  );
}
