import { type NextRequest, NextResponse } from "next/server";
import createNextIntlMiddleware from "next-intl/middleware";

import { defaultLocale, localePrefix, locales } from "@openbulls/i18n/config";

const intlMiddleware = createNextIntlMiddleware({
	locales: [...locales],
	defaultLocale,
	localePrefix,
	localeDetection: true,
});

const PUBLIC_PATHS = new Set<string>(["/", "/sign-in", "/sign-up"]);

/**
 * App-wide gate (Next 16's `proxy.ts`).
 *
 * Pipeline:
 *   1. `intlMiddleware` — locale negotiation. With
 *      `localePrefix: "never"` this is effectively a pass-through
 *      that reads/sets the `NEXT_LOCALE` cookie, but it preserves
 *      the seam for future strategy changes.
 *   2. Auth gate — every path that is not explicitly public and is
 *      not an auth API call requires a `better-auth.session_token`.
 *      Missing cookie → redirect to `/sign-in?redirect=<original>`.
 */
export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const hasSessionCookie = Boolean(req.cookies.get("better-auth.session_token"));
  const isPublic =
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/");

  if (!hasSessionCookie && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
