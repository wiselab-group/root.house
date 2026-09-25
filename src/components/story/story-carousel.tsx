"use client";

import { ArchiveImage } from "@/components/media/archive-image";
import { useState } from "react";
import { CarouselFilm } from "./carousel-film";
import { CarouselGrid } from "./carousel-grid";

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
}

/**
 * The Story page's hero carousel — the filmstrip that was deliberately taken
 * OFF the Person Profile (user request, 2026-09-24: it duplicated the Фото
 * tab there) lives here, matching the reference screenshot: thumbnails
 * switch the photo, the round button runs a slideshow (progress ring), the
 * grid button opens every photo of the story at once.
 *
 * Renders only the photo layers and the bottom controls — the title, meta
 * and top bar are the server-rendered StoryHero around it. Slides crossfade
 * on opacity only (CLAUDE.md animation rules); the slow settle-in zoom is a
 * transform.
 */
export function StoryCarousel({ slides }: { slides: CarouselSlide[] }) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);

  const show = (index: number) =>
    setCurrent((index + slides.length) % slides.length);

  return (
    <div
      className="absolute inset-0"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") show(current + 1);
        if (event.key === "ArrowLeft") show(current - 1);
      }}
    >
      {slides.map((slide, index) => {
        const on = index === current;
        return (
          <div
            key={slide.id}
            aria-hidden={!on}
            className={`absolute inset-0 transition-opacity duration-1000 ease-(--ease-reveal) motion-reduce:transition-none ${on ? "opacity-100" : "opacity-0"}`}
          >
            <div
              className={
                slide.fit === "wide"
                  ? "absolute inset-0"
                  : "hero-photo-mask absolute inset-y-0 right-0 w-full sm:right-[5%] sm:w-1/2"
              }
            >
              <ArchiveImage
                src={slide.src}
                alt={slide.alt}
                fill
                sizes={
                  slide.fit === "wide"
                    ? "100vw"
                    : "(min-width: 640px) 50vw, 100vw"
                }
                className={`object-cover transition-transform duration-[8s] ease-(--ease-reveal) motion-reduce:transition-none ${
                  slide.fit === "wide" ? "object-[50%_40%]" : "object-[50%_20%]"
                } ${on ? "scale-100" : "scale-[1.04]"}`}
                priority={index === 0}
                fade={false}
              />
            </div>
          </div>
        );
      })}
      {slides[current]?.fit === "wide" && (
        <div className="hero-scrim pointer-events-none absolute inset-0" />
      )}

      {slides.length > 1 && (
        <CarouselFilm
          slides={slides}
          current={current}
          playing={playing}
          onSelect={show}
          onTogglePlay={() => setPlaying((value) => !value)}
          onAdvance={() => show(current + 1)}
          onOpenGrid={() => setGridOpen(true)}
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
