import { useTranslations } from "next-intl";
import { MarketingSectionHeading } from "@/components/marketing/marketing-section-heading";
import { TIERS } from "./tiers.data";
import { TierCard } from "./tier-card";
import { PricingFaq } from "./pricing-faq";

/**
 * 07 — What does it cost, and what's holding me back? A plan for every
 * family: start free, switch when you need more space or members. Three
 * plans side by side, Family recommended, and the questions people ask
 * before they sign up — answered with what's true today.
 */
export function PricingSection() {
  const t = useTranslations("landing.pricing");
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="scroll-mt-8 px-4 py-section sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-12 lg:gap-16">
        <MarketingSectionHeading
          id="pricing-title"
          eyebrow={t("eyebrow")}
          title={t("title")}
          subcopy={t("lead")}
        />
        <div className="grid items-stretch gap-6 md:grid-cols-3 md:gap-5">
          {TIERS.map((tier) => (
            <TierCard key={tier.id} tier={tier} />
          ))}
        </div>
        <PricingFaq />
      </div>
    </section>
  );
}
