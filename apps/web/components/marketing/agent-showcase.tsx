"use client";

import {
  Activity,
  ArrowRight,
  Bot,
  Building2,
  FileText,
  type LucideIcon,
  Newspaper,
  PieChart,
  Sparkles,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent } from "@openbulls/ui/components/card";
import { cn } from "@openbulls/ui/lib/utils";

import { useReveal } from "@/hooks/use-reveal";

/**
 * A node in the LangGraph company-analysis diagram.
 *
 * Positions are expressed as percentages (`x`/`y`) inside the diagram
 * canvas. Both the SVG connector layer and the absolutely-positioned
 * chips read from the same coordinate model, so edges always align
 * with their nodes regardless of container size.
 *
 * NOTE: positions/edges are driven by inline styles and a shared
 * `viewBox`, never by dynamically-constructed Tailwind classes (e.g.
 * `col-start-${n}`), which Tailwind's compiler cannot detect and so
 * would never generate.
 */
interface DiagramNode {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: "terminal" | "primary" | "agent";
  icon?: LucideIcon;
}

const NODES: DiagramNode[] = [
  { id: "start", label: "START", x: 50, y: 6, kind: "terminal" },
  { id: "load", label: "load-company", x: 50, y: 22, kind: "primary", icon: Building2 },
  { id: "fin", label: "financials", x: 16, y: 46, kind: "agent", icon: FileText },
  { id: "tech", label: "technical", x: 39, y: 46, kind: "agent", icon: Activity },
  { id: "news", label: "news", x: 61, y: 46, kind: "agent", icon: Newspaper },
  { id: "port", label: "portfolio", x: 84, y: 46, kind: "agent", icon: PieChart },
  { id: "synth", label: "synthesize", x: 50, y: 70, kind: "primary", icon: Sparkles },
  { id: "report", label: "report-writer", x: 50, y: 86, kind: "primary", icon: FileText },
  { id: "end", label: "END", x: 50, y: 98, kind: "terminal" },
];

const NODE_MAP = new Map(NODES.map((n) => [n.id, n]));

interface DiagramEdge {
  from: string;
  to: string;
  /** Highlighted edges render with the primary accent + flow animation. */
  primary?: boolean;
}

const EDGES: DiagramEdge[] = [
  { from: "start", to: "load", primary: true },
  { from: "load", to: "fin" },
  { from: "load", to: "tech", primary: true },
  { from: "load", to: "news" },
  { from: "load", to: "port" },
  { from: "fin", to: "synth" },
  { from: "tech", to: "synth", primary: true },
  { from: "news", to: "synth" },
  { from: "port", to: "synth" },
  { from: "synth", to: "report", primary: true },
  { from: "report", to: "end", primary: true },
];

/** The agents that answer in parallel — shown as chips in the chat reply. */
const AGENT_CHIPS: { icon: LucideIcon; label: string }[] = [
  { icon: FileText, label: "financials" },
  { icon: Activity, label: "technical" },
  { icon: Newspaper, label: "news" },
  { icon: PieChart, label: "portfolio" },
];

/**
 * Two-column section:
 *   left  — LangGraph-style node diagram (deterministic SVG connectors
 *           + absolutely-positioned chips, with an animated flow along
 *           the primary path).
 *   right — chat preview (user question + streaming AI response).
 *
 * The diagram is `aria-hidden` because the textual chat block on the
 * right conveys the same information to assistive tech.
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

          <div className="mt-16 grid items-stretch gap-8 lg:grid-cols-2">
            <GraphDiagram active={visible} />
            <ChatPreview userMessage={t("userMessage")} aiMessage={t("aiMessage")} />
          </div>
        </div>
      </div>
    </section>
  );
}

function GraphDiagram({ active }: { active: boolean }) {
  return (
    <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur">
      <CardContent className="p-6">
        <div className="relative h-[420px] w-full sm:h-[460px]" aria-hidden>
          {/* Connector layer — shares the 0..100 coordinate space with
              the chips below via percentage positioning. */}
          <svg
            className="pointer-events-none absolute inset-0 size-full"
            viewBox="0 0 100 100"
            fill="none"
            preserveAspectRatio="none"
          >
            <title>LangGraph company-analysis workflow</title>
            {EDGES.map((edge) => {
              const from = NODE_MAP.get(edge.from);
              const to = NODE_MAP.get(edge.to);
              if (!from || !to) return null;
              const midY = (from.y + to.y) / 2;
              const d = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
              return (
                <path
                  key={`${edge.from}-${edge.to}`}
                  d={d}
                  vectorEffect="non-scaling-stroke"
                  className={cn(
                    edge.primary ? "stroke-primary/70" : "stroke-border",
                    edge.primary && active && "animate-flow",
                  )}
                  strokeWidth={edge.primary ? 1.6 : 1.2}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {/* Node chips */}
          {NODES.map((node, i) => (
            <GraphNodeChip key={node.id} node={node} index={i} active={active} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function GraphNodeChip({
  node,
  index,
  active,
}: {
  node: DiagramNode;
  index: number;
  active: boolean;
}) {
  const Icon = node.icon;
  return (
    <div
      className={cn(
        "absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-sm backdrop-blur",
        active && "animate-node-pop",
        node.kind === "terminal" &&
          "border-border/60 bg-muted/60 px-3 font-semibold uppercase tracking-widest text-muted-foreground",
        node.kind === "primary" &&
          "border-primary/40 bg-primary/10 text-primary shadow-[0_0_18px_-6px_oklch(0.65_0.18_264)]",
        node.kind === "agent" && "border-border/50 bg-background/70 text-foreground/80",
      )}
      style={{
        left: `${node.x}%`,
        top: `${node.y}%`,
        animationDelay: active ? `${index * 70}ms` : undefined,
      }}
    >
      {Icon ? <Icon className="size-3.5 shrink-0 opacity-80" /> : null}
      {node.label}
    </div>
  );
}

function ChatPreview({
  userMessage,
  aiMessage,
}: {
  userMessage: string;
  aiMessage: string;
}) {
  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur">
      <CardContent className="flex h-full flex-col gap-4 p-6">
        <div className="flex gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <User className="size-4" />
          </div>
          <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm">{userMessage}</div>
        </div>

        <div className="flex gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Bot className="size-4" />
          </div>
          <div className="flex-1 space-y-3 rounded-2xl rounded-tl-sm bg-primary/10 px-4 py-3 text-sm">
            <p>{aiMessage}</p>

            <div className="flex flex-wrap gap-1.5">
              {AGENT_CHIPS.map((chip) => {
                const Icon = chip.icon;
                return (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-background/50 px-2 py-0.5 text-[10px] font-medium text-primary/80"
                  >
                    <Icon className="size-3" />
                    {chip.label}
                  </span>
                );
              })}
            </div>

            <div className="flex items-center gap-2 border-t border-primary/15 pt-2 text-xs text-primary/70">
              <Sparkles className="size-3" />
              <span>4 agent</span>
              <span aria-hidden>•</span>
              <span>2.4s</span>
              <ArrowRight className="ml-auto size-3" />
            </div>
          </div>
        </div>

        {/* Streaming indicator */}
        <div className="mt-auto flex items-center gap-2 pl-11 text-xs text-muted-foreground">
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 animate-typing-dot rounded-full bg-muted-foreground/60"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
