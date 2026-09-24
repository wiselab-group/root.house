import { BookOpenIcon, CalendarIcon, ClockIcon, LockIcon } from "lucide-react";
import type { PrivacyLevel } from "@/db/schema";
import { HeroTopBar } from "@/components/hero/hero-top-bar";
import { HeroMeta } from "@/components/hero/hero-meta";
import { glassChip } from "@/components/hero/glass";
import { StoryCarousel, type CarouselSlide } from "./story-carousel";
import { HeroMoreMenu } from "@/components/hero/hero-more-menu";

const createdFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * The Story page's hero, in the same dark photo-backdrop style as the
 * Person Profile (reference screenshots, 2026-09-24): the carousel's photos
 * fill the hero, the title + meta sit bottom-left, glass pills on top.
 * With no photos at all it collapses to a shorter title block on the plain
 * backdrop instead of an empty photo frame.
 */
export function StoryHero({
  title,
  privacyLevel,
  createdAt,
  readingMinutes,
  slides,
  backHref,
  editHref,
  deleteProps,
}: {
  title: string;
  privacyLevel: PrivacyLevel;
  createdAt: Date;
  readingMinutes: number;
  slides: CarouselSlide[];
  backHref: string;
  editHref: string | null;
  deleteProps: { familyId: string; storyId: string } | null;
}) {
  const hasFilm = slides.length > 1;
  return (
    <header
      className={`relative isolate overflow-hidden ${
        slides.length > 0
          ? "h-[clamp(560px,58vw,740px)]"
          : "h-[clamp(360px,34vw,440px)]"
      }`}
    >
      {slides.length > 0 && <StoryCarousel slides={slides} />}

      <HeroTopBar
        backHref={backHref}
        backLabel="Истории"
        actions={
          <HeroMoreMenu
            editHref={editHref}
            deleteTarget={
              deleteProps
                ? { kind: "story", ...deleteProps, name: title }
                : null
            }
          />
        }
      />

      <div
        className={`pointer-events-none absolute inset-x-4 z-10 flex flex-col gap-4 sm:right-auto sm:left-11 sm:max-w-[min(620px,52%)] ${
          hasFilm ? "bottom-56 sm:bottom-40" : "bottom-10 sm:bottom-14"
        }`}
      >
        <div className="flex flex-wrap gap-1.5">
          <span className={glassChip}>
            <BookOpenIcon aria-hidden="true" />
            История
          </span>
          {privacyLevel === "private" && (
            <span className={glassChip}>
              <LockIcon aria-hidden="true" />
              Только я
            </span>
          )}
        </div>
        <h1 className="text-4xl leading-[1.03] font-light tracking-[-0.025em] text-balance sm:text-5xl lg:text-[4rem]">
          {title}
        </h1>
        <HeroMeta
          items={[
            { Icon: ClockIcon, label: `${readingMinutes} мин чтения` },
            {
              Icon: CalendarIcon,
              label: `Добавлено ${createdFormat.format(createdAt)}`,
            },
          ]}
        />
      </div>
    </header>
  );
}
