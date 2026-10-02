import { useTranslations } from "next-intl";
import { YEAR_FROM, YEAR_TO, type RouteStop } from "./family-route.data";

const TICKS = [YEAR_FROM, 1950, 1975, 2000, YEAR_TO];

/** The map's year as a real range input — keyboard and screen readers get
 *  the year and what happened then via aria-valuetext. */
export function FamilyMapSlider({
  year,
  stop,
  onChange,
}: {
  year: number;
  stop: RouteStop | undefined;
  onChange: (year: number) => void;
}) {
  const t = useTranslations("landing.map");
  return (
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
        onChange={(event) => onChange(Number(event.target.value))}
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
  );
}
