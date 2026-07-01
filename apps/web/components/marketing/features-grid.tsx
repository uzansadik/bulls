"use client";

import {
  Bell,
  Bot,
  Database,
  Languages,
  LineChart,
  type LucideIcon,
  ShieldCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardDescription, CardHeader, CardTitle } from "@openbulls/ui/components/card";

import { useReveal } from "@/hooks/use-reveal";

interface Feature {
  key: "aiAgent" | "portfolio" | "marketData" | "alerts" | "multiLang" | "security";
  icon: LucideIcon;
  gradient: string;
}

const FEATURES: Feature[] = [
  { key: "aiAgent", icon: Bot, gradient: "from-primary/15 to-primary/5" },
  { key: "portfolio", icon: LineChart, gradient: "from-emerald-500/15 to-emerald-500/5" },
  { key: "marketData", icon: Database, gradient: "from-blue-500/15 to-blue-500/5" },
  { key: "alerts", icon: Bell, gradient: "from-amber-500/15 to-amber-500/5" },
  { key: "multiLang", icon: Languages, gradient: "from-violet-500/15 to-violet-500/5" },
  { key: "security", icon: ShieldCheck, gradient: "from-rose-500/15 to-rose-500/5" },
];

/**
 * Six-card features grid. Each card is a `shadcn` `Card` with a
 * gradient background blob tinted by the feature's domain color.
 * The whole grid uses `useReveal` for a single fade-up transition.
 */
export function FeaturesGrid() {
  const t = useTranslations("landing.features");
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div ref={ref} data-revealed={visible} className="animate-reveal">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <FeatureCard
                key={f.key}
                feature={f}
                title={t(`${f.key}.title`)}
                description={t(`${f.key}.description`)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  title,
  description,
}: {
  feature: Feature;
  title: string;
  description: string;
}) {
  const Icon = feature.icon;
  return (
    <Card className="group relative overflow-hidden border-border/60 transition-all hover:-translate-y-1 hover:shadow-lg">
      <div
        className={`absolute inset-0 -z-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
        aria-hidden
      />
      <CardHeader className="relative space-y-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon className="size-5" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
