"use client";

import { useRef } from "react";
import { HERO_SLIDES } from "./hero-slides.data";
import { HeroStackCard } from "./hero-stack-card";
import { HeroStackProgress } from "./hero-stack-progress";
import { useScrollProgress } from "./use-scroll-progress";
import { activeCardIndex, cardTransformForProgress } from "./scroll-stack-math";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Scroll-driven card stack (the user's 21st.dev "scroll-cards" reference) —
 * a tall wrapper (300vh) with a sticky viewport-height window; as the page
 * scrolls through the wrapper, each of the 3 slides transforms/fades in and
 * settles in place, one after another, rather than a horizontal
 * click/swipe slider. Reduced-motion visitors get all 3 cards stacked and
 * fully visible without any scroll-linked transform at all.
 */
export function HeroScrollStack() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(wrapperRef);
  const prefersReducedMotion = useReducedMotion();
  const activeIndex = activeCardIndex(progress, HERO_SLIDES.length);

  if (prefersReducedMotion) {
    return (
      <div
        id="hero-carousel"
        className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8"
      >
        {HERO_SLIDES.map((slide, index) => (
          <HeroStackCard
            key={slide.id}
            slide={slide}
            slideNumber={index + 1}
            totalSlides={HERO_SLIDES.length}
            scale={1}
            opacity={1}
            translateY={0}
            zIndex={index}
            absolute={false}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      id="hero-carousel"
      ref={wrapperRef}
      className="relative"
      style={{ height: `${HERO_SLIDES.length * 100}vh` }}
    >
      <div className="sticky top-0 flex h-svh flex-col items-center justify-center gap-8 overflow-hidden">
        <div className="relative h-120 w-full sm:h-72">
          {HERO_SLIDES.map((slide, index) => {
            const { scale, opacity, translateY } = cardTransformForProgress(
              progress,
              index,
              HERO_SLIDES.length,
            );
            return (
              <HeroStackCard
                key={slide.id}
                slide={slide}
                slideNumber={index + 1}
                totalSlides={HERO_SLIDES.length}
                scale={scale}
                opacity={opacity}
                translateY={translateY}
                zIndex={index}
              />
            );
          })}
        </div>
        <HeroStackProgress slides={HERO_SLIDES} activeIndex={activeIndex} />
      </div>
    </div>
  );
}
