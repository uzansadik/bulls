import { setRequestLocale } from "next-intl/server";

import { AgentShowcase } from "@/components/marketing/agent-showcase";
import { CtaSection } from "@/components/marketing/cta-section";
import { FAQ } from "@/components/marketing/faq";
import { FeaturesGrid } from "@/components/marketing/features-grid";
import { Footer } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { PricingTeaser } from "@/components/marketing/pricing-teaser";
import { TrustBar } from "@/components/marketing/trust-bar";

/**
 * Landing page (`/`) — comprehensive 8-section marketing surface.
 *
 * Order (top → bottom):
 *   1. Hero
 *   2. Trust bar (data providers)
 *   3. Features grid (6 cards)
 *   4. How it works (3 numbered steps)
 *   5. AI Agent showcase (graph + chat)
 *   6. Pricing teaser (3 plans)
 *   7. FAQ (accordion)
 *   8. CTA + footer
 *
 * The page itself has no `proxy.ts` auth gate (`/` is in
 * `PUBLIC_PATHS`), so marketing SEO crawlers see the same content
 * without signing in.
 */
export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-background">
      <MarketingNavbar />
      <main>
        <Hero />
        <TrustBar />
        <FeaturesGrid />
        <HowItWorks />
        <AgentShowcase />
        <PricingTeaser />
        <FAQ />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
