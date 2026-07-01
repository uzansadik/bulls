import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Geist_Mono, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/theme-provider";
import { isLocale, locales } from "@openbulls/i18n/config";
import { cn } from "@openbulls/ui/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

/**
 * `generateStaticParams` lets Next know which `[locale]` values exist.
 * With `localePrefix: "never"` the URL has no `/tr` `/en` segment, but
 * the segment is still part of the routing tree internally.
 */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
