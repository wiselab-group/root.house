import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LandingHero } from "@/components/marketing/hero/landing-hero";
import { ProblemSection } from "@/components/marketing/problem/problem-section";
import { HowSection } from "@/components/marketing/how/how-section";
import { FeatureShowcaseSection } from "@/components/marketing/feature-showcase/feature-showcase-section";
import { FamilyMapSection } from "@/components/marketing/family-map/family-map-section";
import { TogetherSection } from "@/components/marketing/together/together-section";
import { PricingSection } from "@/components/marketing/pricing/pricing-section";
import { FinalCtaSection } from "@/components/marketing/final-cta-section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  const locale = await getLocale();
  const title = t("metaTitle");
  const description = t("metaDescription");
  return {
    title: { absolute: title },
    description,
    openGraph: {
      type: "website",
      siteName: "Root house",
      locale: locale === "ru" ? "ru_RU" : "en_US",
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * The sales landing: what it's worth to me → why → how it works → what I
 * get → the wow (the family's path on a map) → together and private →
 * plans and doubts → start. One fictional family (the Sokolovs / Hartleys)
 * in public-domain archival photos throughout; what Root house doesn't do
 * yet is badged "coming soon", never sold as shipped.
 */
export default async function MarketingPage() {
  const session = await auth();
  if (session?.user) redirect("/families");

  return (
    <>
      <LandingHero />
      <ProblemSection />
      <HowSection />
      <FeatureShowcaseSection />
      <FamilyMapSection />
      <TogetherSection />
      <PricingSection />
      <FinalCtaSection />
    </>
  );
}
