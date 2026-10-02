import { useFormatter, useTranslations } from "next-intl";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CalendarIcon,
  ClockIcon,
  LayoutGridIcon,
  MoreVerticalIcon,
  PlayIcon,
} from "lucide-react";
import {
  glassChip,
  glassIconButton,
  glassIconButtonLarge,
  glassPill,
} from "@/components/hero/glass";
import { StoryPageSlides, StoryPageFilm } from "./story-page-slides";

/** When the demo story was added — fixed, so the page never shows "today". */
const ADDED_AT = new Date(Date.UTC(2026, 8, 21));
const READING_MINUTES = 4;

/**
 * StoryHero at desktop size (classes copied from story-hero.tsx,
 * hero-top-bar.tsx, hero-meta.tsx, story-listen-button.tsx and
 * carousel-film.tsx — `sm:` variants resolved, since the canvas is always
 * "desktop"). Decorative: nothing here is a real control.
 */
export function StoryPageHero() {
  const t = useTranslations("stories");
  const tl = useTranslations("landing.storyPage");
  const format = useFormatter();
  return (
    <div className="relative isolate h-[580px] overflow-hidden">
      <StoryPageSlides />
      <div className="absolute inset-x-7 top-6 z-20 flex items-start justify-between gap-2">
        <span className={glassPill}>
          <ArrowLeftIcon />
          {t("title")}
        </span>
        <span className={glassIconButton}>
          <MoreVerticalIcon />
        </span>
      </div>
      <div className="absolute bottom-40 left-11 z-10 flex max-w-[min(620px,52%)] flex-col gap-4">
        <div className="flex flex-wrap gap-1.5">
          <span className={glassChip}>
            <BookOpenIcon />
            {t("pill")}
          </span>
        </div>
        <p className="font-heading text-[3.75rem] leading-[1.05] font-normal tracking-tight text-balance">
          {tl("title")}
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-foreground/65">
          <li className="flex items-center gap-2">
            <ClockIcon className="size-4 shrink-0 text-foreground/50" />
            {t("minutesReading", { count: READING_MINUTES })}
          </li>
          <li className="flex items-center gap-2">
            <CalendarIcon className="size-4 shrink-0 text-foreground/50" />
            {t("added", { date: format.dateTime(ADDED_AT, "long") })}
          </li>
        </ul>
      </div>
      <div className="absolute inset-x-7 bottom-14 z-20 flex flex-row items-end justify-center gap-12">
        <span className="mb-8.5 inline-flex h-11 shrink-0 items-center gap-2.5 rounded-full bg-primary py-0 pr-5 pl-1.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary-foreground/15 [&_svg]:size-3.5 [&_svg]:fill-current">
            <PlayIcon />
          </span>
          {t("listen", { minutes: READING_MINUTES })}
        </span>
        <StoryPageFilm />
        <span className={`${glassIconButtonLarge} relative mb-8.5 shrink-0`}>
          <svg
            viewBox="0 0 52 52"
            className="pointer-events-none absolute -inset-0.5 size-[calc(100%+4px)]! -rotate-90"
          >
            <circle
              cx="26"
              cy="26"
              r="25"
              pathLength={1}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="story-page-ring"
            />
          </svg>
          <LayoutGridIcon />
        </span>
      </div>
    </div>
  );
}
