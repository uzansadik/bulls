/**
 * next-intl per-request configuration.
 *
 * Reads the requested locale from the URL segment, validates it
 * against the supported set, falls back to `defaultLocale` if missing
 * or unsupported, and returns the matching message catalog.
 *
 * `localePrefix: "never"` means the URL has no `/tr` /`/en` prefix —
 * we still keep the `[locale]` segment in the app router for the
 * layout-level `setRequestLocale` call.
 */
import type { AbstractIntlMessages } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { type Locale, defaultLocale, isLocale, messages } from "@openbulls/i18n";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = isLocale(requested) ? requested : defaultLocale;
  return {
    locale,
    messages: messages[locale] as unknown as AbstractIntlMessages,
  };
});
