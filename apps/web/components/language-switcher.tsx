"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@openbulls/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@openbulls/ui/components/dropdown-menu";
import { CheckIcon, GlobeIcon } from "lucide-react";

import { type Locale, locales } from "@openbulls/i18n/config";

const LOCALE_LABELS: Record<Locale, string> = {
  tr: "Türkçe",
  en: "English",
};

const LOCALE_FLAGS: Record<Locale, string> = {
  tr: "🇹🇷",
  en: "🇬🇧",
};

/**
 * Locale switcher.
 *
 * Because `localePrefix: "never"` is set, the URL never contains a
 * `/tr` /`/en` segment — we keep the pathname the same and only swap
 * the active locale. The switcher writes `NEXT_LOCALE` (read by
 * `proxy.ts` via `createMiddleware` from `@openbulls/i18n/middleware`)
 * and triggers a `router.refresh()` so the server re-renders the
 * page with the new locale.
 */
export function LanguageSwitcher() {
  const activeLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function change(next: Locale) {
    if (next === activeLocale) return;
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000`;
    startTransition(() => {
      router.replace(pathname);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <GlobeIcon className="size-4" />
          <span className="hidden sm:inline">
            {LOCALE_FLAGS[activeLocale]} {LOCALE_LABELS[activeLocale]}
          </span>
          <span className="sm:hidden">{activeLocale.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((l) => (
          <DropdownMenuItem key={l} onClick={() => change(l)} className="flex items-center gap-2">
            <span>{LOCALE_FLAGS[l]}</span>
            <span>{LOCALE_LABELS[l]}</span>
            {l === activeLocale && <CheckIcon className="ml-auto size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
