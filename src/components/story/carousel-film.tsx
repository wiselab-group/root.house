"use client";

import Image from "next/image";
import { LayoutGridIcon, PauseIcon, PlayIcon } from "lucide-react";
import { glassIconButtonLarge } from "@/components/hero/glass";
import { BLUR_PLACEHOLDER } from "@/components/media/blur-placeholder";
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
          aria-label="Фото истории"
          className="flex max-w-full gap-1.5 overflow-x-auto p-1 [scrollbar-width:none]"
        >
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-pressed={index === current}
              aria-label={slide.caption ?? `Фото ${index + 1}`}
              onClick={() => onSelect(index)}
              className="h-14 shrink-0 overflow-hidden rounded-md opacity-55 transition-[opacity,transform] duration-200 ease-(--ease-reveal) hover:-translate-y-0.5 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-pressed:-translate-y-1 aria-pressed:opacity-100 aria-pressed:ring-2 aria-pressed:ring-foreground"
            >
              <Image
                src={slide.src}
                alt=""
                width={96}
                height={56}
                className="h-full w-auto max-w-24 object-cover"
                placeholder="blur"
                blurDataURL={BLUR_PLACEHOLDER}
                unoptimized
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
          aria-label={playing ? "Остановить слайдшоу" : "Слайдшоу"}
          onClick={onTogglePlay}
        >
          {playing && (
            <svg
              aria-hidden="true"
              viewBox="0 0 52 52"
              className="pointer-events-none absolute -inset-0.5 size-[calc(100%+4px)] -rotate-90"
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
          aria-label="Все фото истории"
          onClick={onOpenGrid}
        >
          <LayoutGridIcon aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
