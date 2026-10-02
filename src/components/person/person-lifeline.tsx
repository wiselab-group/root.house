"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { LIFELINE_INSET } from "@/domain/event/lifeline-scale";
import { useInViewOnce } from "@/hooks/use-in-view-once";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useScrollEdges } from "@/hooks/use-scroll-edges";
import { cn } from "@/lib/utils";
import { LifelineDot, axisStyle } from "./lifeline-dot";
import { LifelineEventCard } from "./lifeline-event-card";
import type { LifelinePointView } from "./lifeline-view";

/**
 * The horizontal «Линия жизни» scale from the profile mock (variant 03 of
 * the redesign board): dots on an axis from birth to death / today, labels
 * alternating above and below, and one selected event (terracotta — the
 * app's "what you're looking at" color) expanded in LifelineEventCard.
 * Positions come precomputed from lifelineView; this only owns selection.
 * The track fills its container — a short life fits without scrolling —
 * and only below `minWidth` (where dense years' labels would touch, see
 * layoutLifelineScale) stops shrinking and scrolls sideways instead.
 * Positions are fractions of the span placed with calc(), so the one
 * scale stretches with the track in CSS alone: no measuring, no shift.
 * Motion (globals.css § lifeline): the line unfolds from the birth the
 * first time it's on screen.
 *
 * Desktop: a long line runs on past the column to both window edges (user
 * request 2026-10-02) — the scroller bleeds out by the measured gaps to
 * the edges and is padded back by the same, so the line opens with the
 * birth at the column's left edge and ends at its right one, while the
 * dots in between scroll on out to the window's edges. The track still
 * fills only the column, so a short life looks exactly as before.
 */
export function PersonLifeline({
  points,
  decades,
  minWidth,
}: {
  points: LifelinePointView[];
  decades: { year: number; position: number }[];
  minWidth: number;
}) {
  // A life reads from its start (user request): the first event — usually
  // the birth — is selected, and a scrolling track opens at its left end,
  // so the selected dot and its card always match what's on screen.
  const [selectedId, setSelectedId] = useState(points[0].id);
  const selected = points.find((p) => p.id === selectedId) ?? points[0];
  const reducedMotion = useReducedMotion();
  const { ref: revealRef, inView } = useInViewOnce<HTMLDivElement>();

  const select = (id: string, dot: HTMLElement) => {
    setSelectedId(id);
    // A dot picked under the edge fade (or half off-screen) slides in.
    dot.scrollIntoView({
      inline: "nearest",
      block: "nearest",
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };
  // Gaps from the column's edges to the window's (clientWidth, so a
  // classic scrollbar is never overshot). The observer fires once on
  // observe, so this measures on mount too.
  const [bleed, setBleed] = useState({ left: 0, right: 0 });
  useEffect(() => {
    const el = revealRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const left = Math.max(0, Math.round(rect.left));
      const right = Math.max(
        0,
        Math.round(document.documentElement.clientWidth - rect.right),
      );
      setBleed((prev) =>
        prev.left === left && prev.right === right ? prev : { left, right },
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [revealRef]);
  const { ref, moreStart, moreEnd } = useScrollEdges(
    `${minWidth}:${points.map((p) => p.id).join()}`,
  );

  return (
    <div
      ref={revealRef}
      data-revealed={inView || undefined}
      className="lifeline-reveal flex flex-col gap-4"
    >
      {/* Phones: bleeds past the panel's px-4 to the screen edges. No
          scrollbar — a narrow fade on whichever side the line continues. */}
      <div
        ref={ref}
        style={
          {
            "--bleed-l": `${bleed.left}px`,
            "--bleed-r": `${bleed.right}px`,
          } as CSSProperties
        }
        className={cn(
          "-mx-1 overflow-x-auto px-1 scrollbar-none max-sm:-mx-4 max-sm:overscroll-x-contain max-sm:px-4 sm:mr-[calc(-1*var(--bleed-r))] sm:ml-[calc(-1*var(--bleed-l))] sm:scroll-pl-(--bleed-l) sm:pr-(--bleed-r) sm:pl-(--bleed-l) sm:scroll-pr-(--bleed-r) [&::-webkit-scrollbar]:hidden",
          moreStart && "mask-fade-start",
          moreEnd && "mask-fade-end",
        )}
      >
        <div className="relative h-[250px]" style={{ minWidth }}>
          <div
            aria-hidden="true"
            className="lifeline-track absolute top-[122px] h-2.5 rounded-full bg-tree-accent/80"
            // Rounded ends concentric with the end dots (h-2.5 → 5px radius).
            style={{ left: LIFELINE_INSET - 5, right: LIFELINE_INSET - 5 }}
          />
          {points.map((point) => (
            <LifelineDot
              key={point.id}
              point={point}
              pressed={point.id === selected.id}
              onSelect={(dot) => select(point.id, dot)}
            />
          ))}
          {decades.map((decade) => (
            <span
              key={decade.year}
              aria-hidden="true"
              className="lifeline-decade absolute top-[232px] -translate-x-1/2 text-[11px] text-foreground/35 tabular-nums"
              style={axisStyle(decade.position)}
            >
              {decade.year}
            </span>
          ))}
        </div>
      </div>

      <div className="lifeline-card-reveal">
        <LifelineEventCard point={selected} />
      </div>
    </div>
  );
}
