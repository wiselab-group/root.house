import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { IntroScriptTag } from "@/components/marketing/intro/intro-script-tag";
import { IntroPreloader } from "@/components/marketing/intro/intro-preloader";
import { KeywordHero } from "@/components/marketing/keyword-hero/keyword-hero";
import { MemoryBoxSection } from "@/components/marketing/memory-box/memory-box-section";
import { FeatureShowcaseSection } from "@/components/marketing/feature-showcase/feature-showcase-section";
import { StartWithOnePersonSection } from "@/components/marketing/start-with-one-person-section";
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
      locale: locale === "ru" ? "ru_RU" : "en_US",
      title,
      description,
    },
  };
}

export default async function MarketingPage() {
  const session = await auth();
  if (session?.user) redirect("/families");

  return (
    <>
      {/* Must precede the overlay: decides before first paint whether this
          visit plays the intro (see intro-script.ts). */}
      <IntroScriptTag />
      <IntroPreloader />
      <KeywordHero />
      <MemoryBoxSection />
      <FeatureShowcaseSection />
      <StartWithOnePersonSection />
      <PrivacySection />
      <PricingSection />
      <FinalCtaSection />
    </>
  );
}
