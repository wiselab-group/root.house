"use client";

import { ArchiveImage } from "@/components/media/archive-image";
import { useState, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { usePageVisible } from "@/hooks/use-page-visible";
import { CarouselFilm } from "./carousel-film";
import { CarouselGrid } from "./carousel-grid";
import { useNarration } from "./listen/narration-context";

export interface CarouselSlide {
  id: string;
  /** The "display" copy — the hero itself. */
  src: string;
  /** The "thumb" copy — filmstrip and grid. */
  thumbSrc: string;
  alt: string;
  caption: string | null;
  /** "wide" photos fill the whole hero; "tall" portraits sit on the right
   *  and dissolve into the backdrop, like the Person Profile hero. */
  fit: "wide" | "tall";
  /** The film strip thumbnail's width in px, from the photo's proportions
   *  (film-thumb-size.ts). */
  thumbWidth: number;
}

/**
 * The Story page's hero carousel — the filmstrip that was deliberately taken
 * OFF the Person Profile (user request, 2026-09-24: it duplicated the Фото
 * tab there) lives here, matching the reference screenshot: thumbnails
 * switch the photo, the slideshow runs by itself in a loop, the grid
 * button opens every photo of the story at once and carries the
 * slideshow's progress ring.
 *
 * No play/pause button (user request 2026-09-29: the slideshow is always
 * on). It holds by itself instead — WCAG 2.2.2 wants moving content to be
 * stoppable: while the mouse is over the film bar, while keyboard focus is
 * inside the carousel, while the all-photos grid is open and while the tab
 * is hidden. Under prefers-reduced-motion it doesn't run at all; the
 * thumbnails and ←/→ still switch photos.
 *
 * Renders only the photo layers and the bottom controls — the title, meta
 * and top bar are the server-rendered StoryHero around it. Slides crossfade
 * on opacity only (CLAUDE.md animation rules); the slow settle-in zoom is a
 * transform.
 */
export function StoryCarousel({
  slides,
  listen,
}: {
  slides: CarouselSlide[];
  /** «Слушать», placed left of the film strip (CarouselFilm). */
  listen?: ReactNode;
}) {
  const [current, setCurrent] = useState(0);
  const reducedMotion = useReducedMotion();
  const pageVisible = usePageVisible();
  const [gridOpen, setGridOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  // Keyboard focus only: a thumbnail clicked with the mouse keeps focus,
  // and holding on that would stop the slideshow for good after one click.
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  // While the story is read aloud the voice, not the timer, picks the photo:
  // the one placed nearest above the text being read (story-narration.ts).
  const narration = useNarration();
  const narrating = narration !== null && narration.status !== "idle";
  const narratedPhoto = narrating
    ? (narration.narration.phrases[narration.index]?.photoId ?? null)
    : null;
  const paused =
    narrating || gridOpen || hovering || keyboardFocus || !pageVisible;

  // The slide being covered: it stays fully opaque under the incoming one
  // and only fades once that has fully appeared. Fading both at once
  // dipped to ~50% mid-way and the dark page flashed through (user:
  // «моргает»). Each slide is opaque (bg-background), so the incoming one
  // truly covers it — a tall portrait's dissolving left side otherwise let
  // the previous wide photo show through as a collage.
  const [previous, setPrevious] = useState<number | null>(null);

  // Adjusting state during render when the narrated photo changes (React's
  // "storing information from previous renders"), not in an effect.
  const [lastNarrated, setLastNarrated] = useState<string | null>(null);
  if (narratedPhoto !== lastNarrated) {
    setLastNarrated(narratedPhoto);
    const at = slides.findIndex((slide) => slide.id === narratedPhoto);
    if (at >= 0 && at !== current) {
      setPrevious(current);
      setCurrent(at);
    }
  }

  const show = (index: number) => {
    const next = (index + slides.length) % slides.length;
    if (next === current) return;
    setPrevious(current);
    setCurrent(next);
  };

  return (
    <div
      className="absolute inset-0"
      onFocus={(event) =>
        setKeyboardFocus(event.target.matches(":focus-visible"))
      }
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setKeyboardFocus(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") show(current + 1);
        if (event.key === "ArrowLeft") show(current - 1);
      }}
    >
      {slides.map((slide, index) => {
        const on = index === current;
        const leaving = index === previous;
        // The next slide loads ahead, so it is decoded before its turn.
        const upcoming = index === (current + 1) % slides.length;
        return (
          <div
            key={slide.id}
            aria-hidden={!on}
            className={`absolute inset-0 bg-background transition-opacity duration-cinematic ease-(--ease-reveal) motion-reduce:transition-none ${
              on
                ? "z-2 opacity-100"
                : leaving
                  ? "z-1 opacity-0 delay-(--duration-cinematic)"
                  : "opacity-0"
            }`}
          >
            <div
              className={
                slide.fit === "wide"
                  ? "photo-tone absolute inset-0"
                  : "hero-photo-mask absolute inset-y-0 right-0 w-full sm:w-[55%]"
              }
            >
              <ArchiveImage
                src={slide.src}
                alt={slide.alt}
                fill
                sizes={
                  slide.fit === "wide"
                    ? "100vw"
                    : "(min-width: 640px) 55vw, 100vw"
                }
                className={`object-cover transition-transform duration-[8s] ease-(--ease-reveal) motion-reduce:transition-none ${
                  slide.fit === "wide" ? "object-[50%_40%]" : "object-[50%_20%]"
                } ${on ? "scale-100" : "scale-[1.04]"}`}
                priority={index === 0}
                loading={
                  index === 0 ? undefined : on || upcoming ? "eager" : "lazy"
                }
                fade={false}
              />
            </div>
            {/* Inside the slide, so it fades with its photo instead of
                popping on/off when a wide and a tall photo swap. */}
            {slide.fit === "wide" && (
              <div className="hero-scrim pointer-events-none absolute inset-0" />
            )}
          </div>
        );
      })}

      {slides.length > 1 && (
        <CarouselFilm
          slides={slides}
          current={current}
          autoplay={!reducedMotion}
          paused={paused}
          onSelect={show}
          onAdvance={() => show(current + 1)}
          onOpenGrid={() => setGridOpen(true)}
          onHover={setHovering}
          captionHidden={narrating}
          leading={listen}
        />
      )}
      <CarouselGrid
        slides={slides}
        open={gridOpen}
        onClose={() => setGridOpen(false)}
        onSelect={(index) => {
          show(index);
          setGridOpen(false);
        }}
      />
    </div>
  );
}
