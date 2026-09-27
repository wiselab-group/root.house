"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useScrollProgress } from "@/components/marketing/shared/use-scroll-progress";
import {
  connectorOpacity,
  fragmentProgress,
  windowProgress,
} from "@/components/marketing/shared/scroll-math";
import { MEMORY_CONNECTORS, MEMORY_FRAGMENTS } from "./memory-fragments.data";
import { MemoryFragmentView } from "./memory-fragment-view";

/**
 * The landing's signature moment: loose photos and notes, as they come out
 * of a box, travel on scroll into their people's cards and settle into a
 * family tree — the same seven objects throughout, nothing appears or
 * disappears. The caption turns from the problem to the answer halfway.
 * Reduced motion: no tall wrapper, the finished tree.
 */
export function MemoryBoxSection() {
  const wrapperRef = useRef<HTMLElement>(null);
  const scrollProgress = useScrollProgress(wrapperRef);
  const prefersReducedMotion = useReducedMotion();
  const progress = prefersReducedMotion ? 1 : scrollProgress;
  // The problem fades out completely before the answer fades in — two
  // half-visible headings on top of each other read as a glitch.
  const problem = 1 - windowProgress(progress, 0.38, 0.06);
  const answer = windowProgress(progress, 0.45, 0.06);
  const lines = connectorOpacity(progress);

  return (
    <section
      id="how-it-works"
      ref={wrapperRef}
      aria-labelledby="memory-box-title"
      className={cn(
        "relative",
        prefersReducedMotion ? "py-section" : "h-[230svh]",
      )}
    >
      <div
        className={cn(
          "flex flex-col justify-center gap-8 px-6",
          !prefersReducedMotion && "sticky top-0 h-svh overflow-hidden",
        )}
      >
        <div className="mx-auto grid max-w-3xl text-center">
          <h2
            id="memory-box-title"
            className="col-start-1 row-start-1 font-heading text-title font-medium text-balance transition-[opacity,transform] duration-slow ease-(--ease-reveal)"
            style={{
              opacity: problem,
              transform: `translateY(${(1 - problem) * -12}px)`,
            }}
          >
            The photos are there. Who&apos;s in them — only grandma remembers.
          </h2>
          <p
            className="col-start-1 row-start-1 font-heading text-title font-medium text-balance transition-[opacity,transform] duration-slow ease-(--ease-reveal)"
            style={{
              opacity: answer,
              transform: `translateY(${(1 - answer) * 12}px)`,
            }}
          >
            Root house gives every memory a person to belong to.
          </p>
        </div>
        <div className="memory-stage relative mx-auto aspect-square w-[min(100%,calc(100svh-15rem))] sm:aspect-[16/10] sm:w-[min(100%,calc((100svh-15rem)*1.6))]">
          {(["desktop", "mobile"] as const).map((layout) => (
            <svg
              key={layout}
              aria-hidden="true"
              viewBox={MEMORY_CONNECTORS[layout].viewBox}
              className={cn(
                "absolute inset-0 size-full transition-opacity duration-slow",
                layout === "desktop" ? "hidden sm:block" : "sm:hidden",
              )}
              style={{ opacity: lines }}
            >
              {MEMORY_CONNECTORS[layout].paths.map((d) => (
                <path
                  key={d}
                  d={d}
                  fill="none"
                  stroke="var(--branch)"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          ))}
          <div aria-hidden="true">
            {MEMORY_FRAGMENTS.map((fragment, index) => (
              <MemoryFragmentView
                key={fragment.person}
                fragment={fragment}
                t={fragmentProgress(progress, index, MEMORY_FRAGMENTS.length)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
