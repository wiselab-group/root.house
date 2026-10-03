import { useTranslations } from "next-intl";
import { eventAt } from "./hero-years.data";

/**
 * The year beside the copy, large but thin and a shade dimmer than the
 * headline, so the headline still reads first — with the year's event
 * under it. Hidden from screen readers: the range below already speaks
 * the year and its event, and a live region here would read out a year
 * every second of autoplay.
 */
export function HeroYearMark({ year }: { year: number }) {
  const t = useTranslations("landing.hero");
  const event = eventAt(year);
  return (
    <div
      aria-hidden="true"
      className="flex flex-col lg:items-end lg:text-right"
    >
      <span className="hero-years-mark text-foreground/88 tabular-nums">
        {year}
      </span>
      <span
        key={event.id}
        className="hero-years-event mt-3 font-heading text-[clamp(0.9375rem,0.85rem+0.4vw,1.125rem)] font-medium text-muted-foreground"
      >
        {t(`events.${event.id}`)}
      </span>
    </div>
  );
}
