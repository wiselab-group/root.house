"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, type ReactNode } from "react";
import { ArchiveImage } from "@/components/media/archive-image";
import { LayoutGridIcon } from "lucide-react";
import { glassIconButtonLarge } from "@/components/hero/glass";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { CarouselSlide } from "./story-carousel";
import { FILM_THUMB_HEIGHT } from "./film-thumb-size";

/**
 * StoryCarousel's bottom bar: a strip of thumbnails with the current
 * photo's caption under it (user request 2026-09-28) and the "all photos"
 * button, which also carries the slideshow's timer — a progress ring whose
 * own animationend shows the next photo (no setTimeout, per CLAUDE.md's
 * FORBIDDEN list). There's no play/pause button any more: the slideshow
 * always runs (user request 2026-09-29) and holds by itself while the
 * pointer is over this bar — see StoryCarousel for every hold.
 */
export function CarouselFilm({
  slides,
  current,
  autoplay,
  paused,
  onSelect,
  onAdvance,
  onOpenGrid,
  onHover,
  captionHidden,
  leading,
}: {
  slides: CarouselSlide[];
  current: number;
  /** Off under prefers-reduced-motion: no ring, no timer. */
  autoplay: boolean;
  /** The ring freezes where it is and picks up from there. */
  paused: boolean;
  onSelect: (index: number) => void;
  onAdvance: () => void;
  onOpenGrid: () => void;
  onHover: (hovering: boolean) => void;
  /** While the story is read aloud the player's capsule covers the
   *  caption line (and the voice tells the story) — it fades out. Lifting
   *  the whole bar instead covered the hero's «Пауза» button. */
  captionHidden: boolean;
  /** The «Слушать» button — left of the strip, mirroring «Все фото». */
  leading?: ReactNode;
}) {
  const tStories = useTranslations("stories");
  const t = useTranslations("stories");
  const caption = slides[current]?.caption;
  const stripRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();

  // Focus follows the photo: a clicked thumbnail kept focus, so paging with
  // ←/→ (or the slideshow) left its focus ring on the old thumbnail (user
  // screenshot, 2026-09-29 — same fix as LightboxFilmstrip). Only when focus
  // is already in the strip; preventScroll so no ancestor scrolls.
  // The current thumbnail always sits in the middle of the strip, the
  // others fade and blur toward both edges (user request 2026-09-29).
  // scrollTo on the strip itself — scrollIntoView would scroll the page.
  useEffect(() => {
    const strip = stripRef.current;
    const thumb = currentRef.current;
    if (!strip || !thumb) return;
    strip.scrollTo({
      left: thumb.offsetLeft - (strip.clientWidth - thumb.offsetWidth) / 2,
      behavior: reducedMotion ? "auto" : "smooth",
    });
    if (
      strip.contains(document.activeElement) &&
      document.activeElement !== thumb
    ) {
      thumb.focus({ preventScroll: true });
    }
  }, [current, reducedMotion]);

  return (
    <div
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") onHover(true);
      }}
      onPointerLeave={() => onHover(false)}
      className="absolute inset-x-4 bottom-12 z-20 flex flex-col gap-3 sm:inset-x-7 sm:gap-12 sm:bottom-14 sm:flex-row sm:items-end sm:justify-center"
    >
      {/* sm: «Слушать» at the hero's left edge, «Все фото» at its right, the
          strip stretched to fill the row between them (user 2026-09-29: a
          fixed-width strip left wide gaps to the buttons), level
          with the thumbnails, not the caption line under them — mb-8.5 =
          caption (h-5) + gap-2.5 + the strip's p-1. Phones: one row under
          the strip, «Слушать» left, «Все фото» right. */}
      {leading && (
        <div className="pointer-events-auto flex shrink-0 max-sm:absolute max-sm:bottom-0 max-sm:left-0 sm:mb-8.5">
          {leading}
        </div>
      )}
      <div className="flex min-w-0 flex-col items-center gap-2.5 sm:flex-1">
        <div className="relative w-full">
          <div
            ref={stripRef}
            role="group"
            aria-label={t("photos")}
            className="mask-fade-x relative flex gap-1.5 overflow-x-auto p-1 scrollbar-none"
          >
            {/* Room so the first and last thumbnails can reach the middle. */}
            <span aria-hidden="true" className="w-[calc(50%-3rem)] shrink-0" />
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                ref={index === current ? currentRef : undefined}
                type="button"
                aria-pressed={index === current}
                aria-label={
                  slide.caption ?? tStories("photoN", { n: index + 1 })
                }
                onClick={() => onSelect(index)}
                // No lift on hover/current: the strip scrolls horizontally, so
                // it clips vertically too — a raised thumb lost its ring's top
                // edge and sat off the others' line. Current = ring + full
                // opacity, all thumbs on one baseline; the ring fits in p-1.
                className="photo-tone relative h-14 shrink-0 overflow-hidden rounded-md bg-muted opacity-55 transition-[opacity,transform] duration-base ease-(--ease-reveal) hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-95 aria-pressed:opacity-100 aria-pressed:ring-2 aria-pressed:ring-foreground aria-pressed:focus-visible:ring-foreground"
              >
                {/* The photo's own width at the strip's height, known before
                    it loads: nothing shifts as thumbnails arrive, and the
                    drawn size is exactly width × height — a fixed 96×56
                    with CSS `w-auto` narrowed portraits by one side only,
                    which next/image warns about in the console. */}
                <ArchiveImage
                  src={slide.thumbSrc}
                  alt=""
                  width={slide.thumbWidth}
                  height={FILM_THUMB_HEIGHT}
                  className="h-full object-cover"
                />
              </button>
            ))}
            <span aria-hidden="true" className="w-[calc(50%-3rem)] shrink-0" />
          </div>
          <div
            aria-hidden="true"
            className="film-edge-blur-start pointer-events-none absolute inset-y-0 left-0 w-24 backdrop-blur-[3px]"
          />
          <div
            aria-hidden="true"
            className="film-edge-blur-end pointer-events-none absolute inset-y-0 right-0 w-24 backdrop-blur-[3px]"
          />
        </div>
        <p
          aria-live="polite"
          className={`min-h-5 max-w-full truncate text-xs leading-5 text-foreground/65 transition-opacity duration-base ease-(--ease-reveal) motion-reduce:transition-none ${captionHidden ? "opacity-0" : ""}`}
        >
          {caption}
        </p>
      </div>

      <div className="flex shrink-0 gap-2 self-end sm:mb-8.5">
        <button
          type="button"
          className={`${glassIconButtonLarge} relative`}
          aria-label={t("allPhotos")}
          onClick={onOpenGrid}
        >
          {autoplay && (
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
                // Inline, not a utility class: .animate-carousel-ring's own
                // `animation` shorthand would reset the play state.
                style={{ animationPlayState: paused ? "paused" : "running" }}
                onAnimationEnd={onAdvance}
              />
            </svg>
          )}
          <LayoutGridIcon aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
