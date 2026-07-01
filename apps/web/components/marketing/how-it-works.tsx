"use client";

import { Brain, CheckCircle2, Link2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useTranslations } from "next-intl";

import { Card, CardContent } from "@openbulls/ui/components/card";

import { useReveal } from "@/hooks/use-reveal";

interface Step {
  key: "step1" | "step2" | "step3";
  icon: LucideIcon;
}

const STEPS: Step[] = [
  { key: "step1", icon: Link2 },
  { key: "step2", icon: Brain },
  { key: "step3", icon: CheckCircle2 },
];

/**
 * Three-step "How it works" section. Numbered circles connect via
 * a horizontal gradient line on lg, vertical on mobile. Each step
 * reveals individually with `useReveal`.
 */
export function HowItWorks() {
  const t = useTranslations("landing.howItWorks");
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <section className="border-t border-border/40 bg-muted/20 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div ref={ref} data-revealed={visible} className="animate-reveal">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>
          </div>

          <div className="relative mt-16">
            {/* connector line (desktop only) */}
            <div
              className="absolute top-8 right-0 left-0 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block"
              aria-hidden
            />
            <div className="grid gap-6 lg:grid-cols-3">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <Card key={s.key} className="relative bg-background/80 backdrop-blur">
                    <CardContent className="space-y-4 p-6">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground ring-4 ring-primary/15">
                          {i + 1}
                        </div>
                        <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Icon className="size-5" />
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold">{t(`${s.key}.title`)}</h3>
                      <p className="text-sm text-muted-foreground">{t(`${s.key}.description`)}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
