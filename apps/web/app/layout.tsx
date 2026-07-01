/**
 * Minimal root layout — defers `html`/`body` rendering to
 * `app/[locale]/layout.tsx` so next-intl can drive the `lang` attribute
 * and mount the `NextIntlClientProvider`. The font CSS variables are
 * attached on the locale layout so the active locale owns them.
 */
import "@openbulls/ui/globals.css";
import "./landing.css";

import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
