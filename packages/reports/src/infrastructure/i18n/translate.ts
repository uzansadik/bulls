/**
 * @openbulls/reports — server-side i18n helper.
 *
 * Reads the JSON message catalog directly from \`@openbulls/i18n\`
 * (no \`next-intl\` peer dependency — that requires \`next\`, which
 * the agent-worker doesn't have).
 *
 * Used by the markdown renderer to swap section headers + body
 * copy based on the user's locale. The default locale (\`tr\`)
 * matches \`@openbulls/i18n\`.
 *
 * Format: nested keys (\`reports.portfolio_review.title\`).
 */
import { messages, type Locale } from "@openbulls/i18n";

const DEFAULT_LOCALE: Locale = "tr";

/**
 * Resolve a nested key from a message catalog. Returns \`fallback\`
 * (or the key itself when fallback is missing) when the path is
 * not present — same shape as next-intl's \`t()\`.
 */
export function resolveMessage(
  catalog: Record<string, unknown>,
  keyPath: string,
  fallback?: string,
): string {
  const segments = keyPath.split(".");
  let cursor: unknown = catalog;
  for (const seg of segments) {
    if (cursor === null || typeof cursor !== "object") return fallback ?? keyPath;
    cursor = (cursor as Record<string, unknown>)[seg];
  }
  return typeof cursor === "string" ? cursor : fallback ?? keyPath;
}

/**
 * Public t() helper for the reports package. Reads the locale's
 * catalog directly (no \`useTranslations\` hook).
 */
export function t(
  locale: Locale | string | undefined,
  keyPath: string,
  vars?: Readonly<Record<string, unknown>>,
): string {
  const safeLocale: Locale =
    locale === "en" || locale === "tr" ? locale : DEFAULT_LOCALE;
  const catalog = messages[safeLocale] as Record<string, unknown>;
  let template = resolveMessage(catalog, keyPath, keyPath);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      template = template.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`), String(v));
    }
  }
  return template;
}

/** Defensive cast helper for callers that hold an unknown locale string. */
export function asLocale(value: unknown): Locale {
  return value === "en" || value === "tr" ? value : DEFAULT_LOCALE;
}