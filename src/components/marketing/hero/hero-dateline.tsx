import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { YEAR_FROM, YEAR_TO, eventAt, yearProgress } from "./hero-years.data";

/**
 * The year as a date under a photo — «1952 · Свадьба в Риге» — over a thin
 * line that is a real range input: drag it, or arrow through the years;
 * screen readers get the year and its event via aria-valuetext. No live
 * region: autoplay would read out a year every second.
 */
export function HeroDateline({
  year,
  onChange,
}: {
  year: number;
  onChange: (year: number) => void;
}) {
  const t = useTranslations("landing.hero");
  const event = eventAt(year);
  const label = t(`events.${event.id}`);
  return (
    <div className="flex flex-col gap-2.5">
      <p className="flex items-center gap-2.5 text-[0.84375rem]">
        <span className="hero-years-year font-medium tabular-nums">{year}</span>
        <span
          aria-hidden="true"
          className="size-0.75 rounded-full bg-muted-foreground/70"
        />
        <span key={event.id} className="hero-years-event">
          {label}
        </span>
      </p>
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
        style={{ "--p": `${yearProgress(year) * 100}%` } as CSSProperties}
      />
    </div>
  );
}
