import { useTranslations } from "next-intl";

const PROVIDERS = ["KAP", "TCMB", "Yahoo Finance", "Twelve Data", "SEC", "Bloomberg"];

/**
 * Single-line trust bar listing market-data providers as
 * muted text. The platform is young enough that we don't have logo
 * assets; placeholder wordmarks are intentionally typographic.
 */
export function TrustBar() {
  const t = useTranslations("landing.trustBar");

  return (
    <section className="border-y border-border/40 bg-muted/20 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mb-6 text-center text-xs uppercase tracking-widest text-muted-foreground">
          {t("title")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-60">
          {PROVIDERS.map((p) => (
            <span key={p} className="text-lg font-semibold tracking-tight text-muted-foreground">
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
