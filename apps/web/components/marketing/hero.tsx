import { ArrowRight, ChartLineIcon, SparklesIcon, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { Button } from "@openbulls/ui/components/button";

/**
 * Marketing hero.
 *
 * Three-column layout on lg: copy + CTAs / dashboard mock / stats.
 * Animated background is pure CSS (radial gradient blobs that
 * slowly drift via @keyframes; no client JS).
 */
export function Hero() {
  const t = useTranslations("landing.hero");

  return (
    <section className="relative overflow-hidden">
      {/* Animated gradient mesh */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute -top-40 -left-32 size-[600px] rounded-full bg-primary/30 blur-[120px] animate-blob" />
        <div className="absolute top-20 -right-32 size-[520px] rounded-full bg-accent/30 blur-[120px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/3 size-[480px] rounded-full bg-accent/20 blur-[120px] animate-blob animation-delay-4000" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-20 pb-24 sm:px-6 lg:px-8 lg:pt-32 lg:pb-32">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Copy column */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <SparklesIcon className="size-3.5 text-primary" />
              <span>{t("trustBadge")}</span>
            </div>

            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {t("title")}
            </h1>

            <p className="max-w-xl text-pretty text-lg text-muted-foreground sm:text-xl">
              {t("subtitle")}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link href="/sign-up">
                  {t("ctaPrimary")}
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#features">{t("ctaSecondary")}</Link>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                99.9% uptime
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-primary" />
                SOC2-ready
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-accent" />
                Türkçe + English
              </span>
            </div>
          </div>

          {/* Mock dashboard preview */}
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-primary/20 via-accent/20 to-primary/20 blur-2xl" />
            <div className="rounded-xl border border-border/60 bg-card/80 p-3 shadow-2xl backdrop-blur">
              <div className="flex items-center gap-1.5 border-b border-border/40 px-2 py-2">
                <span className="size-2.5 rounded-full bg-red-500/70" />
                <span className="size-2.5 rounded-full bg-yellow-500/70" />
                <span className="size-2.5 rounded-full bg-emerald-500/70" />
                <span className="ml-3 text-xs text-muted-foreground">
                  {t("browserPreviewLabel")}
                </span>
              </div>
              <div className="space-y-3 p-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "THYAO", val: "+%4.2", color: "text-emerald-500" },
                    { label: "GARAN", val: "+%1.8", color: "text-emerald-500" },
                    { label: "ASELS", val: "-%0.6", color: "text-red-500" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-md border border-border/40 bg-background/40 p-2"
                    >
                      <div className="text-[10px] text-muted-foreground">{s.label}</div>
                      <div className={`text-sm font-semibold ${s.color}`}>{s.val}</div>
                    </div>
                  ))}
                </div>
                <div className="relative h-32 overflow-hidden rounded-md border border-border/40 bg-background/40">
                  {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative preview chart */}
                  <svg
                    className="absolute inset-0 size-full"
                    viewBox="0 0 300 100"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <defs>
                      <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.65 0.18 264)" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="oklch(0.65 0.18 264)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,70 L20,65 L40,68 L60,55 L80,58 L100,45 L120,50 L140,35 L160,40 L180,30 L200,38 L220,25 L240,30 L260,18 L280,22 L300,15"
                      fill="none"
                      stroke="oklch(0.65 0.18 264)"
                      strokeWidth="2"
                    />
                    <path
                      d="M0,70 L20,65 L40,68 L60,55 L80,58 L100,45 L120,50 L140,35 L160,40 L180,30 L200,38 L220,25 L240,30 L260,18 L280,22 L300,15 L300,100 L0,100 Z"
                      fill="url(#heroGradient)"
                    />
                  </svg>
                  <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-[10px] font-medium backdrop-blur">
                    <ChartLineIcon className="size-3 text-emerald-500" />
                    <span className="text-emerald-500">+%12.4</span>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border/40 bg-background/40 p-2">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-full bg-primary/15">
                      <TrendingUp className="size-3.5 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs font-medium">AI Agent</div>
                      <div className="text-[10px] text-muted-foreground">
                        Portföy analizi tamamlandı
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">2 sn önce</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
