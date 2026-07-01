/**
 * Locale configuration.
 *
 * - `defaultLocale`: locale used when none is detected.
 * - `locales`: every locale the app supports.
 * - `localePrefix`: URL strategy — `"never"` means no `/tr` `/en` prefix
 *   in the URL; the active locale is carried via the `NEXT_LOCALE`
 *   cookie + `next-intl`'s in-memory state. Marketing-friendly for
 *   this app: clean canonical URLs and the locale switcher is purely
 *   UI-driven.
 */

export const defaultLocale = "tr" as const;
export const locales = ["tr", "en"] as const;
export const localePrefix = "never" as const;

export type Locale = (typeof locales)[number];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function asLocale(value: string): Locale {
  if (!isLocale(value)) {
    throw new Error(`Unsupported locale: ${value}`);
  }
  return value;
}
