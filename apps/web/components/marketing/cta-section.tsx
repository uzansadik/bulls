"use client";

import { ArrowRight, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { Button } from "@openbulls/ui/components/button";

import { useReveal } from "@/hooks/use-reveal";

/**
 * Final call-to-action strip. Big gradient panel with a single
 * primary button pointing to `/sign-up`.
 */
export function CtaSection() {
  const t = useTranslations("landing.cta");
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          data-revealed={visible}
          className="animate-reveal relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/90 via-primary to-primary/70 p-12 shadow-2xl sm:p-16"
        >
          <div className="pointer-events-none absolute inset-0 -z-0 opacity-30" aria-hidden>
            <div className="absolute -top-20 -right-20 size-80 rounded-full bg-white/30 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 size-80 rounded-full bg-white/30 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-2xl text-center">
            <SparklesIcon className="mx-auto size-8 text-white/80" />
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              {t("title")}
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/85">{t("subtitle")}</p>
            <div className="mt-8 flex justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/sign-up">
                  {t("button")}
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
