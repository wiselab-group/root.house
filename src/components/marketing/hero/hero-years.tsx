"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { usePageVisible } from "@/hooks/use-page-visible";
import { HeroPhotos } from "./hero-photos";
import { HeroDateline } from "./hero-dateline";
import {
  REST_YEAR,
  YEAR_FROM,
  elapsedForYear,
  yearAtElapsed,
} from "./hero-years.data";

/** How long autoplay waits after the visitor moves the line themselves. */
const RESUME_AFTER_MS = 5_000;

/**
 * The hero as a hundred years of one family: the era's photo behind the
 * copy and the year as a date under it, travelling 1928 → 2026 on its own
 * while the hero is on screen and the tab is visible. Dragging the line
 * takes over; autoplay picks up from there a few seconds later. Reduced
 * motion: no autoplay, the hero rests on the wedding until moved by hand.
 */
export function HeroYears({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const pageVisible = usePageVisible();
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(true);
  const [year, setYear] = useState(YEAR_FROM);
  const [touched, setTouched] = useState(false);
  const yearRef = useRef(year);
  const movedAtRef = useRef(Number.NEGATIVE_INFINITY);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) =>
      setInView(entry.isIntersecting),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || !pageVisible || !inView) return;
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (now - movedAtRef.current < RESUME_AFTER_MS) {
        start = null;
      } else {
        start ??= now - elapsedForYear(yearRef.current);
        const next = yearAtElapsed(now - start);
        if (next !== yearRef.current) {
          yearRef.current = next;
          setYear(next);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced, pageVisible, inView]);

  function move(next: number) {
    movedAtRef.current = performance.now();
    yearRef.current = next;
    setYear(next);
    setTouched(true);
  }

  const shown = reduced && !touched ? REST_YEAR : year;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-title"
      className="hero-years relative isolate flex min-h-[max(620px,calc(100svh-var(--marketing-header-h)))] flex-col overflow-hidden px-4 pt-14 pb-9 sm:px-6 sm:pt-16"
    >
      <HeroPhotos year={shown} />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6">
        <div className="flex flex-1 items-center">{children}</div>
        <HeroDateline year={shown} onChange={move} />
      </div>
    </section>
  );
}
