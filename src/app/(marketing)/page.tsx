import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { INTRO_SCRIPT } from "@/components/marketing/intro/intro-script";
import { IntroPreloader } from "@/components/marketing/intro/intro-preloader";
import { KeywordHero } from "@/components/marketing/keyword-hero/keyword-hero";
import { MemoryBoxSection } from "@/components/marketing/memory-box/memory-box-section";
import { FeatureShowcaseSection } from "@/components/marketing/feature-showcase/feature-showcase-section";
import { StartWithOnePersonSection } from "@/components/marketing/start-with-one-person-section";
import { PrivacySection } from "@/components/marketing/privacy-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { FinalCtaSection } from "@/components/marketing/final-cta-section";

const TITLE = "Root house — Create the living story of your family";
const DESCRIPTION =
  "A private home for your family's people, photos and stories. Build the tree, keep the memories behind it, and invite the relatives who remember.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "en_US",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default async function MarketingPage() {
  const session = await auth();
  if (session?.user) redirect("/families");

  return (
    <>
      {/* Must precede the overlay: decides before first paint whether this
          visit plays the intro (see intro-script.ts). */}
      <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
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
