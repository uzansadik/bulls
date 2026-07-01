/**
 * @openbulls/i18n
 *
 * Centralized locale configuration and message catalogs. Apps wire up
 * `next-intl` using the helpers exported here so that locale routing and
 * default-fallback behavior stay consistent.
 */

export {
  defaultLocale,
  locales,
  localePrefix,
  type Locale,
  isLocale,
  asLocale,
} from "./config.js";

export { createMiddleware } from "./middleware.js";
export { messages } from "./messages.js";
