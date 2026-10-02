"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MarketingSectionHeading } from "@/components/marketing/marketing-section-heading";
import { SHOWCASE_FEATURES } from "./features.data";
import { FeatureShowcaseItem } from "./feature-showcase-item";

/**
 * Apple-style feature block (the user's skiper76 reference): one list item
 * open at a time. On desktop its illustration crossfades in beside the
 * list — every panel stays mounted so switching is a pure opacity/transform
 * crossfade; hidden ones are `inert`. On phones that column is gone and
 * the open row carries its own illustration under its text (an image
 * above the list would change off-screen). The list is real buttons with
 * aria-expanded, so it works from the keyboard like any disclosure.
 */
export function FeatureShowcaseSection() {
  const t = useTranslations("landing");
  const [activeIndex, setActiveIndex] = useState(0);
  const active = SHOWCASE_FEATURES[activeIndex];

  return (
    <section
      id="features"
      aria-labelledby="showcase-title"
      className="scroll-mt-8 px-4 py-section sm:px-6"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.35fr] lg:gap-16">
        <div className="flex flex-col gap-8">
          <MarketingSectionHeading
            id="showcase-title"
            align="left"
            eyebrow={t("showcaseEyebrow")}
            title={t("showcaseTitle")}
          />
          <ul className="divide-y divide-border border-y border-border">
            {SHOWCASE_FEATURES.map((feature, index) => (
              <FeatureShowcaseItem
                key={feature.id}
                feature={feature}
                index={index}
                isOpen={index === activeIndex}
                onOpen={() => setActiveIndex(index)}
              />
            ))}
          </ul>
          <p className="text-center text-xs text-muted-foreground lg:hidden">
            {t("demoNote")}
          </p>
        </div>
        <div className="flex flex-col gap-3 max-lg:hidden">
          <div
            id="showcase-illustration"
            role="img"
            aria-label={t(`features.${active.id}.title`)}
            className="relative aspect-4/3 w-full"
          >
            {SHOWCASE_FEATURES.map(({ id, Panel }, index) => (
              <div
                key={id}
                inert={index !== activeIndex}
                className={cn(
                  "absolute inset-0 transition-[opacity,transform] duration-reveal ease-(--ease-reveal)",
                  index === activeIndex
                    ? "opacity-100"
                    : "translate-y-3 scale-[0.98] opacity-0",
                )}
              >
                <Panel />
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {t("demoNote")}
          </p>
        </div>
      </div>
    </section>
  );
}
