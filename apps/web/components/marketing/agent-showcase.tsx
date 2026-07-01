"use client";

import { ArrowRight, Bot, User } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent } from "@openbulls/ui/components/card";
import { cn } from "@openbulls/ui/lib/utils";

import { useReveal } from "@/hooks/use-reveal";

interface GraphNode {
  id: string;
  label: string;
  row: number;
  col: number;
  highlight?: boolean;
}

const NODES: GraphNode[] = [
  { id: "start", label: "START", row: 0, col: 1, highlight: true },
  { id: "load", label: "load-company", row: 1, col: 1, highlight: true },
  { id: "fin", label: "financial-statement.subagent", row: 2, col: 0 },
  { id: "tech", label: "technical-analysis.subagent", row: 2, col: 1, highlight: true },
  { id: "news", label: "market-news.subagent", row: 2, col: 2 },
  { id: "port", label: "portfolio-impact.subagent", row: 2, col: 3 },
  { id: "synth", label: "synthesize", row: 3, col: 1, highlight: true },
  { id: "report", label: "report-writer", row: 4, col: 1, highlight: true },
  { id: "end", label: "END", row: 5, col: 1 },
];

const ROW_LABELS = [
  { row: 1, label: "" },
  { row: 2, label: "company" },
  { row: 3, label: "parallel agents" },
  { row: 4, label: "merge" },
  { row: 5, label: "compose" },
  { row: 6, label: "" },
];

/**
 * Two-column section:
 *   left  — LangGraph-style node diagram (decorative SVG with
 *           animated "scan" highlight on the active path).
 *   right — chat preview (user question + AI response bubble).
 *
 * The diagram is hand-positioned via CSS grid (`row`/`col` keys) so
 * it scales cleanly without D3 / vis-network. `aria-hidden` since the
 * textual chat block on the right conveys the same info.
 */
export function AgentShowcase() {
  const t = useTranslations("landing.agent");
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div ref={ref} data-revealed={visible} className="animate-reveal">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-2">
            {/* Graph diagram */}
            <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur">
              <CardContent className="p-6">
                <div
                  className="relative grid grid-cols-4 gap-3"
                  style={{ gridTemplateRows: "auto repeat(4, minmax(48px, auto))" }}
                  aria-hidden
                >
                  {/* Row labels */}
                  {ROW_LABELS.map((r) =>
                    r.label ? (
                      <div
                        key={r.row}
                        className="col-start-1 row-start-[var(--row)] -ml-1 self-center text-xs uppercase tracking-widest text-muted-foreground/60"
                        style={{ ["--row" as never]: String(r.row) }}
                      >
                        {r.label}
                      </div>
                    ) : null,
                  )}

                  {NODES.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        `col-start-${n.col + 1} row-start-${n.row + 1}`,
                        n.highlight
                          ? "rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-center text-xs font-medium text-primary shadow-[0_0_18px_-6px_oklch(0.65_0.18_264)]"
                          : "rounded-md border border-border/40 bg-background/50 px-3 py-2 text-center text-xs text-muted-foreground",
                      )}
                    >
                      {n.label}
                    </div>
                  ))}

                  {/* SVG connectors */}
                  {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative */}
                  <svg
                    className="pointer-events-none absolute inset-0 size-full text-border"
                    viewBox="0 0 400 280"
                    fill="none"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    {/* Edges (manually positioned) */}
                    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M100,40 L100,60" />
                      <path d="M100,90 L60,120" />
                      <path d="M100,90 L140,120" />
                      <path d="M100,90 L220,120" />
                      <path d="M100,90 L300,120" />
                      <path d="M60,160 L100,190" />
                      <path d="M140,160 L100,190" />
                      <path d="M220,160 L100,190" />
                      <path d="M300,160 L100,190" />
                      <path d="M100,220 L100,240" />
                    </g>
                    {/* Animated scan line — follows the active path */}
                    <g
                      stroke="oklch(0.65 0.18 264)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.7"
                    >
                      <line x1="100" y1="40" x2="100" y2="240" className="animate-scan" />
                    </g>
                  </svg>
                </div>
              </CardContent>
            </Card>

            {/* Chat preview */}
            <Card className="border-border/60 bg-card/80 backdrop-blur">
              <CardContent className="space-y-4 p-6">
                <div className="flex gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="size-4" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm">
                    {t("userMessage")}
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Bot className="size-4" />
                  </div>
                  <div className="space-y-2 rounded-2xl rounded-tl-sm bg-primary/10 px-4 py-3 text-sm">
                    <p>{t("aiMessage")}</p>
                    <div className="flex items-center gap-1.5 text-xs text-primary/80">
                      <span>4 agent</span>
                      <span>•</span>
                      <span>2.4s</span>
                      <ArrowRight className="size-3" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
