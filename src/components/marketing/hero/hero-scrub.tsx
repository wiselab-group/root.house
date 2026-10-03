import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { YEAR_FROM, YEAR_TO, eventAt, yearProgress } from "./hero-years.data";

const DECADES = [1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

/**
 * The hundred years as a range across the hero's foot — drag it, or arrow
 * through the years; screen readers get the year and its event via
 * aria-valuetext — with the decades marked under it. A mark sits under
 * the thumb's centre at that year (the thumb travels inset by half its
 * width); on a phone every other decade is left out.
 */
export function HeroScrub({
  year,
  onChange,
}: {
  year: number;
  onChange: (year: number) => void;
}) {
  const t = useTranslations("landing.hero");
  const label = t(`events.${eventAt(year).id}`);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="hero-year" className="sr-only">
        {t("yearLabel")}
      </label>
      <input
        id="hero-year"
        type="range"
        min={YEAR_FROM}
        max={YEAR_TO}
        step={1}
        value={year}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${year}: ${label}`}
        className="hero-years-range"
      />
      <div
        aria-hidden="true"
        className="relative h-4.5 font-mono text-[0.6875rem] text-muted-foreground/80 tabular-nums"
      >
        {DECADES.map((decade, i) => (
          <span
            key={decade}
            className={`hero-years-tick absolute -translate-x-1/2 ${i % 2 ? "max-sm:hidden" : ""}`}
            style={{ "--p": yearProgress(decade) } as CSSProperties}
          >
            {decade}
          </span>
        ))}
      </div>
    </div>
  );
}
