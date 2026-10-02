import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LandingHero } from "@/components/marketing/hero/landing-hero";
import { ProblemSection } from "@/components/marketing/problem/problem-section";
import { TogetherSection } from "@/components/marketing/together/together-section";
import { VoiceSection } from "@/components/marketing/voice/voice-section";
import { FamilyMapSection } from "@/components/marketing/family-map/family-map-section";
import { GrowthSection } from "@/components/marketing/growth/growth-section";
import { AskFamilySection } from "@/components/marketing/ask-family/ask-family-section";
import { ArchiveSection } from "@/components/marketing/archive/archive-section";
import { PrivacySection } from "@/components/marketing/privacy-section";
import { PricingSection } from "@/components/marketing/pricing-section";
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
 * The sales landing, told as one family's story (the fictional Sokolovs /
 * Hartleys): what it is → why → with whom → how easy → what you discover →
 * what it becomes → how gaps get filled → where it's kept → who owns it →
 * start. Things Root house doesn't do yet are badged "coming soon".
 */
export default async function MarketingPage() {
  const session = await auth();
  if (session?.user) redirect("/families");

  return (
    <>
      <LandingHero />
      <ProblemSection />
      <TogetherSection />
      <VoiceSection />
      <FamilyMapSection />
      <GrowthSection />
      <AskFamilySection />
      <ArchiveSection />
      <PrivacySection />
      <PricingSection />
      <FinalCtaSection />
    </>
  );
}
