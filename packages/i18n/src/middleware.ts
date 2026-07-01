import createNextIntlMiddleware from "next-intl/middleware";
import { defaultLocale, localePrefix, locales } from "./config.js";

/**
 * Build a `next-intl` middleware with Openbulls' locale config baked in.
 * Apps export this as `middleware.ts`.
 */
export function createMiddleware() {
  return createNextIntlMiddleware({
    locales: [...locales],
    defaultLocale,
    localePrefix,
    localeDetection: true,
  });
}
