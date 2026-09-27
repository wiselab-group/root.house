"use client";

import { useTranslations } from "next-intl";
import { ArchiveImage } from "@/components/media/archive-image";
import { LayoutGridIcon, PauseIcon, PlayIcon } from "lucide-react";
import { glassIconButtonLarge } from "@/components/hero/glass";
import type { CarouselSlide } from "./story-carousel";

/**
 * StoryCarousel's bottom bar: the current photo's caption over a strip of
 * thumbnails, the slideshow button (its progress ring IS the timer — the
 * next slide is shown on the ring animation's own animationend, no
 * setTimeout, per CLAUDE.md's FORBIDDEN list) and the "all photos" button.
 */
export function CarouselFilm({
  slides,
  current,
  playing,
  onSelect,
  onTogglePlay,
  onAdvance,
  onOpenGrid,
}: {
  slides: CarouselSlide[];
  current: number;
  playing: boolean;
  onSelect: (index: number) => void;
  onTogglePlay: () => void;
  onAdvance: () => void;
  onOpenGrid: () => void;
}) {
  const tStories = useTranslations("stories");
  const t = useTranslations("stories");
  const caption = slides[current]?.caption;

  return (
    <div className="absolute inset-x-4 bottom-12 z-20 flex flex-col gap-3 sm:inset-x-7 sm:bottom-14 sm:flex-row sm:items-end sm:justify-center">
      <div className="flex min-w-0 flex-col items-start gap-2.5 sm:items-center">
        <p
          aria-live="polite"
          className="min-h-5 max-w-full truncate text-xs text-foreground/65"
        >
          {caption}
        </p>
        <div
          role="group"
          aria-label={t("photos")}
          className="flex max-w-full gap-1.5 overflow-x-auto p-1 [scrollbar-width:none]"
        >
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-pressed={index === current}
              aria-label={slide.caption ?? tStories("photoN", { n: index + 1 })}
              onClick={() => onSelect(index)}
              // No lift on hover/current: the strip scrolls horizontally, so
              // it clips vertically too — a raised thumb lost its ring's top
              // edge and sat off the others' line. Current = ring + full
              // opacity, all thumbs on one baseline; the ring fits in p-1.
              className="photo-tone relative h-14 shrink-0 overflow-hidden rounded-md bg-muted opacity-55 transition-[opacity,transform] duration-base ease-(--ease-reveal) hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-95 aria-pressed:opacity-100 aria-pressed:ring-2 aria-pressed:ring-foreground"
            >
              <ArchiveImage
                src={slide.thumbSrc}
                alt=""
                width={96}
                height={56}
                className="h-full w-auto max-w-24 object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 self-end sm:absolute sm:right-0 sm:bottom-1">
        <button
          type="button"
          className={`${glassIconButtonLarge} relative`}
          aria-pressed={playing}
          aria-label={playing ? t("stopSlideshow") : t("slideshow")}
          onClick={onTogglePlay}
        >
          {playing && (
            <svg
              aria-hidden="true"
              viewBox="0 0 52 52"
              // `!`: glassIconButtonLarge's `[&_svg]:size-5` (meant for the
              // icon) is more specific and shrank the ring to a 20px
              // spinner-like arc in the button's corner.
              className="pointer-events-none absolute -inset-0.5 size-[calc(100%+4px)]! -rotate-90"
            >
              <circle
                key={current}
                cx="26"
                cy="26"
                r="25"
                pathLength={1}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="animate-carousel-ring"
                onAnimationEnd={onAdvance}
              />
            </svg>
          )}
          {playing ? (
            <PauseIcon aria-hidden="true" />
          ) : (
            <PlayIcon className="translate-x-px" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className={glassIconButtonLarge}
          aria-label={t("allPhotos")}
          onClick={onOpenGrid}
        >
          <LayoutGridIcon aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
