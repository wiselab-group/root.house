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
  if (!SHOW_PRICING) return null;

  return (
    <section className="px-6 py-16 sm:py-20">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-10">
        <MarketingSectionHeading title="Simple pricing, for the whole family." />
        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
          <PricingTierCard
            name="Free"
            price="€0"
            features={[
              "Family tree",
              "People & relationships",
              "Basic memories",
              "Invite family",
            ]}
          />
          <PricingTierCard
            name="Family Archive"
            price="€59"
            cadence="year"
            description="For the whole family."
            recommended
            features={[
              "Unlimited family members",
              "Unlimited photos & stories",
              "Full timeline",
              "Collaboration & roles",
              "Private family space",
              "Search",
            ]}
          />
        </div>
      </div>
    </section>
  );
}
