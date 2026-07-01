import { TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

const COLUMNS = [
  {
    key: "product",
    items: ["productLink1", "productLink2", "productLink3"],
  },
  {
    key: "company",
    items: ["companyLink1", "companyLink2", "companyLink3"],
  },
  {
    key: "legal",
    items: ["legalLink1", "legalLink2", "legalLink3"],
  },
  {
    key: "contact",
    items: ["contactLink1", "contactLink2"],
  },
] as const;

/**
 * Marketing footer. Static links (no i18n routing on anchors —
 * hrefs are placeholders that route to `#` until those pages exist).
 */
export function Footer() {
  const t = useTranslations("landing.footer");

  return (
    <footer className="border-t border-border/40 bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <TrendingUp className="size-4" />
              </div>
              <span>Openbulls</span>
            </Link>
            <p className="max-w-xs text-sm text-muted-foreground">
              AI-powered finance, portfolio and market data platform.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.key} className="space-y-4">
              <h4 className="text-sm font-semibold">{t(col.key)}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {col.items.map((item) => (
                  <li key={item}>
                    <Link href="#" className="transition-colors hover:text-foreground">
                      {t(item)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border/40 pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">{t("copyright")}</p>
          <p className="text-xs text-muted-foreground/60">
            Built with Next.js · LangGraph · Drizzle
          </p>
        </div>
      </div>
    </footer>
  );
}
