"use client";

import { CheckIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { Badge } from "@openbulls/ui/components/badge";
import { Button } from "@openbulls/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@openbulls/ui/components/card";
import { cn } from "@openbulls/ui/lib/utils";

import { useReveal } from "@/hooks/use-reveal";

interface Plan {
  key: "free" | "pro" | "enterprise";
  highlighted: boolean;
}

const PLANS: Plan[] = [
  { key: "free", highlighted: false },
  { key: "pro", highlighted: true },
  { key: "enterprise", highlighted: false },
];

/**
 * Three-plan pricing teaser. Plans are read from the i18n catalog
 * (so TR / EN stay in sync without a separate data file).
 *
 * The middle (Pro) plan is highlighted with `scale-[1.02]` and a
 * primary ring + a "Most Popular" badge.
 */
export function PricingTeaser() {
  const t = useTranslations("landing.pricing");
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <section id="pricing" className="border-t border-border/40 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div ref={ref} data-revealed={visible} className="animate-reveal">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>
          </div>

          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            {PLANS.map((p) => (
              <PlanCard key={p.key} plan={p} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const t = useTranslations(`landing.pricing.${plan.key}`);
  const features = t.raw("features") as string[];
  return (
    <Card
      className={cn(
        "relative h-full transition-all hover:-translate-y-1",
        plan.highlighted
          ? "scale-[1.02] border-primary/60 shadow-lg ring-2 ring-primary/20"
          : "border-border/60",
      )}
    >
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="gap-1">
            <SparklesIcon className="size-3" />
            {t("badge")}
          </Badge>
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-xl">{t("name")}</CardTitle>
        <CardDescription className="text-sm">
          <span className="text-3xl font-bold text-foreground">{t("price")}</span>
          {(t("period") as string).length > 0 && (
            <span className="text-muted-foreground">{t("period")}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <CheckIcon className="size-4 shrink-0 text-primary" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <Button className="w-full" variant={plan.highlighted ? "default" : "outline"} asChild>
          <Link href="/sign-up">{t("cta")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
