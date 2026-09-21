import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { HeroSection } from "@/components/marketing/hero-section";
import { ConnectingSection } from "@/components/marketing/connecting-section";
import { MoreThanTreeSection } from "@/components/marketing/more-than-tree-section";
import { GenerationalValueSection } from "@/components/marketing/generational-value-section";
import { StartWithOnePersonSection } from "@/components/marketing/start-with-one-person-section";
import { PrivacySection } from "@/components/marketing/privacy-section";
import { FeatureGridSection } from "@/components/marketing/feature-grid-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { FinalCtaSection } from "@/components/marketing/final-cta-section";

export const metadata: Metadata = {
  title: {
    absolute: "Root house — A private home for your family's story",
  },
  description:
    "Build your family tree, preserve the stories behind it, and collect your family's photos and memories — together, in one private place.",
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Root house — A private home for your family's story",
    description:
      "Build your family tree, preserve the stories behind it, and collect your family's photos and memories — together, in one private place.",
  },
};

export default async function MarketingPage() {
  const session = await auth();
  if (session?.user) redirect("/families");

  return (
    <>
      <HeroSection />
      <ConnectingSection />
      <MoreThanTreeSection />
      <GenerationalValueSection />
      <StartWithOnePersonSection />
      <PrivacySection />
      <FeatureGridSection />
      <PricingSection />
      <FinalCtaSection />
    </>
  );
}
