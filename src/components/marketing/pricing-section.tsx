import { useTranslations } from "next-intl";
import { MarketingSectionHeading } from "@/components/marketing/marketing-section-heading";
import { PricingTierCard } from "@/components/marketing/pricing-tier-card";

/**
 * Pricing is fully built but hidden until real billing exists
 * (Family.planTier is schema-only, always 'free' — see PRODUCT.md Out of
 * Scope: billing/subscriptions/Stripe). Flip to true only alongside real
 * billing wiring.
 */
const SHOW_PRICING = false;

export function PricingSection() {
  const t = useTranslations("landing");
  if (!SHOW_PRICING) return null;

  return (
    <section className="px-6 py-16 sm:py-20">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-10">
        <MarketingSectionHeading title={t("pricingTitle")} />
        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
          <PricingTierCard
            name={t("free")}
            price="€0"
            features={t("freeFeatures").split("|")}
          />
          <PricingTierCard
            name={t("archiveTier")}
            price="€59"
            cadence={t("perYear")}
            description={t("archiveTierDescription")}
            recommended
            features={t("archiveFeatures").split("|")}
          />
        </div>
      </div>
    </section>
  );
}
