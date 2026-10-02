"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useInViewOnce } from "@/hooks/use-in-view-once";
import { MarketingSectionHeading } from "@/components/marketing/marketing-section-heading";
import { DemoNote } from "@/components/marketing/shared/soon-badge";
import { FamilyMapCanvas } from "./family-map-canvas";
import { FamilyMapStop } from "./family-map-stop";
import { ROUTE_STOPS, YEAR_FROM, YEAR_TO, stopAt } from "./family-route.data";
import { useYearAutoplay } from "./use-year-autoplay";

const TICKS = [YEAR_FROM, 1950, 1975, 2000, YEAR_TO];

/**
 * 05 — What can I discover? The family's path across a century, one year
 * slider away: the first time the map comes into view it plays through the
 * years on its own, and taking the slider hands control to the visitor.
 * Reduced motion: it simply opens on the last year.
 */
export function FamilyMapSection() {
  const t = useTranslations("landing.map");
  const prefersReducedMotion = useReducedMotion();
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.4);
  const [userYear, setUserYear] = useState<number | null>(null);
  const playYear = useYearAutoplay(
    inView && !prefersReducedMotion && userYear === null,
    YEAR_FROM,
    YEAR_TO,
  );
  const year =
    userYear ?? playYear ?? (prefersReducedMotion ? YEAR_TO : YEAR_FROM);
  const stop = stopAt(year);

  return (
    <section aria-labelledby="map-title" className="px-4 py-section sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <MarketingSectionHeading
          id="map-title"
          title={t("title")}
          subcopy={t("lead")}
        />
        <div
          ref={ref}
          className="grid items-center gap-6 lg:grid-cols-[1.4fr_1fr] lg:gap-12"
        >
          <FamilyMapCanvas year={year} />
          <div className="flex flex-col gap-6">
            <FamilyMapStop year={year} stop={stop} />
            <div className="flex flex-col gap-2">
              <label
                htmlFor="family-map-year"
                className="text-xs tracking-[0.14em] text-muted-foreground uppercase"
              >
                {t("yearLabel")}
              </label>
              <input
                id="family-map-year"
                type="range"
                min={YEAR_FROM}
                max={YEAR_TO}
                step={1}
                value={year}
                onChange={(event) => setUserYear(Number(event.target.value))}
                aria-valuetext={
                  stop ? `${year}: ${t(`stops.${stop.id}`)}` : String(year)
                }
                className="w-full cursor-pointer accent-primary"
              />
              <div
                aria-hidden="true"
                className="flex justify-between text-xs text-muted-foreground tabular-nums"
              >
                {TICKS.map((tick) => (
                  <span key={tick}>{tick}</span>
                ))}
              </div>
            </div>
            <DemoNote soon>{t("realNote")}</DemoNote>
          </div>
        </div>
        <ol className="sr-only" aria-label={t("label")}>
          {ROUTE_STOPS.map((item) => (
            <li key={item.id}>
              {item.year}: {t(`stops.${item.id}`)}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
