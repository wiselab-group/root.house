"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useScrollProgress } from "@/components/marketing/shared/use-scroll-progress";
import { MarketingSectionHeading } from "@/components/marketing/marketing-section-heading";
import { DemoNote } from "@/components/marketing/shared/soon-badge";
import { FamilyMapCanvas } from "./family-map-canvas";
import { FamilyMapStop } from "./family-map-stop";
import { FamilyMapSlider } from "./family-map-slider";
import {
  ROUTE_STOPS,
  YEAR_TO,
  progressForYear,
  stopAt,
  yearAtProgress,
} from "./family-route.data";

/** Keeps the map inside the sticky viewport: its height (width / ~1.08,
 *  map-geo.ts MAP_ASPECT) may use what the heading, the year card and the
 *  slider leave free — stacked on phones, side by side from lg. */
const MAP_FIT =
  "max-w-[calc((100svh-var(--marketing-header-h)-24rem)*1.08)] lg:max-w-[calc((100svh-var(--marketing-header-h)-15rem)*1.08)]";

/**
 * 05 — What can I discover? The family's path across a century, driven by
 * scrolling: a tall wrapper with a sticky viewport, the year advancing and
 * the routes drawing as the page moves. The slider shows the same year and,
 * when dragged, scrolls the page to it — one source of truth, no fight
 * between the two. Reduced motion: no tall wrapper, the slider alone sets
 * the year, starting on the last one.
 */
export function FamilyMapSection() {
  const t = useTranslations("landing.map");
  const wrapperRef = useRef<HTMLElement>(null);
  const progress = useScrollProgress(wrapperRef);
  const prefersReducedMotion = useReducedMotion();
  const [staticYear, setStaticYear] = useState(YEAR_TO);
  const time = prefersReducedMotion ? staticYear : yearAtProgress(progress);
  const year = Math.round(time);
  const stop = stopAt(time);

  function chooseYear(next: number) {
    const wrapper = wrapperRef.current;
    if (prefersReducedMotion || !wrapper) {
      setStaticYear(next);
      return;
    }
    const top = wrapper.getBoundingClientRect().top + window.scrollY;
    const scrollable = wrapper.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + progressForYear(next) * scrollable });
  }

  return (
    <section
      ref={wrapperRef}
      aria-labelledby="map-title"
      className={cn(
        "relative",
        prefersReducedMotion ? "py-section" : "h-[320svh]",
      )}
    >
      <div
        className={cn(
          "flex flex-col justify-center gap-5 px-4 sm:px-6 lg:gap-10",
          !prefersReducedMotion &&
            "sticky top-(--marketing-header-h) h-[calc(100svh-var(--marketing-header-h))] overflow-hidden",
        )}
      >
        <MarketingSectionHeading
          id="map-title"
          title={t("title")}
          subcopy={<span className="max-sm:hidden">{t("lead")}</span>}
        />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-4 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
          <div className={cn("mx-auto w-full", MAP_FIT)}>
            <FamilyMapCanvas year={time} />
          </div>
          <div className="flex flex-col gap-4 lg:gap-6">
            <FamilyMapStop year={year} stop={stop} />
            <FamilyMapSlider year={year} stop={stop} onChange={chooseYear} />
            <DemoNote soon className="max-lg:hidden">
              {t("realNote")}
            </DemoNote>
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
