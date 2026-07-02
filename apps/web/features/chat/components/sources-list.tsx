/**
 * apps/web — chat sources list.
 *
 * Renders the canonical sources panel at the bottom of an assistant
 * message — typically news URLs, financial-statement references, or
 * KAP disclosures surfaced by market-data tools.
 *
 * Wraps `ai-elements`' `Sources`/`SourcesTrigger`/`SourcesContent`/
 * `Source` to keep token ownership consistent across the chat
 * surface. The trigger counts the number of items so the user gets a
 * quick sense of how much external evidence backs the answer.
 *
 * Empty list renders nothing — a sources section with zero entries
 * would just be visual noise.
 */
"use client";

import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@openbulls/ui/components/ai-elements/sources";

export interface SourceItem {
  readonly href: string;
  readonly title: string;
}

export interface SourcesListProps {
  readonly sources: ReadonlyArray<SourceItem>;
  readonly className?: string;
}

export function SourcesList({ sources, className }: SourcesListProps) {
  if (sources.length === 0) return null;
  return (
    <Sources className={className}>
      <SourcesTrigger count={sources.length} />
      <SourcesContent>
        {sources.map((s) => (
          <Source href={s.href} key={s.href} title={s.title} />
        ))}
      </SourcesContent>
    </Sources>
  );
}
