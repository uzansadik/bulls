"use client";

import { Menu, TrendingUp, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@openbulls/ui/components/button";
import { cn } from "@openbulls/ui/lib/utils";

import { LanguageSwitcher } from "@/components/language-switcher";

const NAV_LINKS = [
  { key: "features", href: "#features" },
  { key: "pricing", href: "#pricing" },
  { key: "faq", href: "#faq" },
] as const;

/**
 * Sticky landing navbar.
 *
 * - Transparent at top, gains `backdrop-blur` + border once the
 *   user scrolls past 12px.
 * - Collapses into a hamburger menu below `md` breakpoint.
 * - Hosts the `LanguageSwitcher` on the right.
 */
export function MarketingNavbar() {
  const t = useTranslations("landing.navbar");
  const tNav = useTranslations("nav");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled ? "border-b border-border/50 bg-background/80 backdrop-blur-md" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <TrendingUp className="size-4" />
          </div>
          <span>Openbulls</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {tNav(l.key)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher />
          <Button variant="ghost" asChild>
            <Link href="/sign-in">{t("signIn")}</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">{t("signUp")}</Link>
          </Button>
        </div>

        <button
          type="button"
          className="md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/50 bg-background/95 backdrop-blur-md md:hidden">
          <div className="space-y-3 px-4 py-4 sm:px-6">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.key}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                {tNav(l.key)}
              </Link>
            ))}
            <div className="flex items-center gap-2 pt-2">
              <LanguageSwitcher />
              <Button variant="outline" asChild>
                <Link href="/sign-in">{t("signIn")}</Link>
              </Button>
              <Button asChild>
                <Link href="/sign-up">{t("signUp")}</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
