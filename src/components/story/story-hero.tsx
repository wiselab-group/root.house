import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { BookOpenIcon, CalendarIcon, ClockIcon, LockIcon } from "lucide-react";
import type { PrivacyLevel } from "@/db/schema";
import { HeroTopBar } from "@/components/hero/hero-top-bar";
import { HeroMeta } from "@/components/hero/hero-meta";
import { glassChip } from "@/components/hero/glass";
import { StoryCarousel, type CarouselSlide } from "./story-carousel";
import { HeroMoreMenu } from "@/components/hero/hero-more-menu";

/**
 * The Story page's hero, in the same dark photo-backdrop style as the
 * Person Profile (reference screenshots, 2026-09-24): the carousel's photos
 * fill the hero, the title + meta sit bottom-left, glass pills on top.
 * With photos it fills the screen under the app header exactly (user
 * request 2026-09-28) — it used to be sized off the window's width and ran
 * past the bottom edge on wide, short windows, cutting off the caption.
 * 560px floor so the title block and the film strip never overlap.
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
  listen,
}: {
  title: string;
  privacyLevel: PrivacyLevel;
  createdAt: Date;
  readingMinutes: number;
  slides: CarouselSlide[];
  backHref: string;
  editHref: string | null;
  deleteProps: { familyId: string; storyId: string } | null;
  /** The «Слушать» button (client): left of the film strip, or under the
   *  reading time when the story has no strip. */
  listen?: ReactNode;
}) {
  const tc = useTranslations("common");
  const t = useTranslations("stories");
  const format = useFormatter();
  const hasFilm = slides.length > 1;
  return (
    <header
      className={`relative isolate overflow-hidden ${
        slides.length > 0
          ? "h-[max(560px,calc(100svh-var(--app-header-h)))]"
          : "h-[clamp(360px,34vw,440px)]"
      }`}
    >
      {slides.length > 0 && (
        <StoryCarousel slides={slides} listen={hasFilm ? listen : undefined} />
      )}

      <HeroTopBar
        backHref={backHref}
        backLabel={t("title")}
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
            {t("pill")}
          </span>
          {privacyLevel === "private" && (
            <span className={glassChip}>
              <LockIcon aria-hidden="true" />
              {tc("onlyMe")}
            </span>
          )}
        </div>
        <h1 className="font-heading text-display leading-[1.05] font-normal tracking-tight text-balance">
          {title}
        </h1>
        <HeroMeta
          items={[
            {
              Icon: ClockIcon,
              label: t("minutesReading", { count: readingMinutes }),
            },
            {
              Icon: CalendarIcon,
              label: t("added", { date: format.dateTime(createdAt, "long") }),
            },
          ]}
        />
        {/* With a film strip «Слушать» sits left of it (CarouselFilm). */}
        {!hasFilm && listen}
      </div>
    </header>
  );
}
