"use client";

import { useTranslations } from "next-intl";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@openbulls/ui/components/accordion";

import { useReveal } from "@/hooks/use-reveal";

const QUESTIONS = ["q1", "q2", "q3", "q4", "q5", "q6"] as const;

/**
 * FAQ accordion. Question/answer pairs are pulled from the i18n
 * catalog so both languages stay aligned.
 */
export function FAQ() {
  const t = useTranslations("landing.faq");
  const { ref, visible } = useReveal<HTMLDivElement>();

  return (
    <section id="faq" className="border-t border-border/40 bg-muted/20 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div ref={ref} data-revealed={visible} className="animate-reveal">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight sm:text-4xl">
            {t("title")}
          </h2>

          <Accordion type="single" collapsible className="w-full">
            {QUESTIONS.map((q, i) => (
              <AccordionItem key={q} value={`q-${i}`}>
                <AccordionTrigger className="text-left">{t(q)}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t(`a${i + 1}`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
