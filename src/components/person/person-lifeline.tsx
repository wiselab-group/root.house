"use client";

import { useState } from "react";
import { LIFELINE_INSET } from "@/domain/event/lifeline-scale";
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
 * scale stretches with the track in CSS alone: no measuring, no shift
 * after hydration.
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

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:thin]">
        <div className="relative h-[250px]" style={{ minWidth }}>
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-[122px] h-2.5 rounded-full bg-tree-accent/80"
          />
          {points.map((point) => (
            <LifelineDot
              key={point.id}
              point={point}
              pressed={point.id === selected.id}
              onSelect={() => setSelectedId(point.id)}
            />
          ))}
          {decades.map((decade) => (
            <span
              key={decade.year}
              aria-hidden="true"
              className="absolute top-[232px] -translate-x-1/2 text-[11px] text-foreground/35 tabular-nums"
              style={{ left: axisLeft(decade.position) }}
            >
              {decade.year}
            </span>
          ))}
        </div>
      </div>

      <LifelineEventCard point={selected} />
    </div>
  );
}

function LifelineDot({
  point,
  pressed,
  onSelect,
}: {
  point: LifelinePointView;
  pressed: boolean;
  onSelect: () => void;
}) {
  const up = point.side === "up";
  // A label centered on a dot at the very start/end of the axis would hang
  // past the scroll box and get clipped — anchor those to the dot instead.
  const edge =
    point.align === "start"
      ? "-ml-1.5 self-start text-left"
      : point.align === "end"
        ? "-mr-1.5 self-end text-right"
        : "text-center";
  const label = (
    <span
      className={`${edge} rounded-lg px-1.5 py-0.5 leading-[1.3] whitespace-nowrap transition-colors duration-200 ease-(--ease-reveal) group-hover:bg-glass`}
    >
      <b
        className={`block text-sm font-medium tabular-nums ${pressed ? "text-primary" : ""}`}
      >
        {point.year}
      </b>
      <small className="text-xs text-foreground/55">{point.caption}</small>
    </span>
  );
  const stem = <span className={`w-px bg-branch ${up ? "h-5" : "h-6"}`} />;
  const dot = (
    <span
      className={`size-[11px] rounded-full border-2 transition-transform duration-200 ease-(--ease-reveal) group-hover:scale-125 ${
        pressed
          ? "border-primary bg-primary shadow-[0_0_0_5px_color-mix(in_oklch,var(--primary)_25%,transparent)]"
          : "border-tree-accent bg-card"
      }`}
    />
  );

  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={`${point.year}: ${point.caption}`}
      onClick={onSelect}
      // Label first in the DOM on both sides (so it gets the focus ring);
      // below the axis the column simply runs bottom-up, dot on the axis.
      className={`group absolute flex w-0 -translate-x-1/2 cursor-pointer items-center gap-1 focus-visible:outline-none [&:focus-visible>span:first-child]:ring-2 [&:focus-visible>span:first-child]:ring-ring ${
        up ? "bottom-29.5 flex-col" : "top-30.25 flex-col-reverse"
      }`}
      style={{ left: axisLeft(point.position) }}
    >
      {label}
      {stem}
      {dot}
    </button>
  );
}

/** A span fraction → CSS left: the end dots sit LIFELINE_INSET in from the
 *  track edges, everything else on one linear scale between them. */
function axisLeft(fraction: number): string {
  return `calc(${LIFELINE_INSET}px + ${fraction} * (100% - ${2 * LIFELINE_INSET}px))`;
}
