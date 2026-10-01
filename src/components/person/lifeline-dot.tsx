"use client";

import type { CSSProperties } from "react";
import { LIFELINE_INSET } from "@/domain/event/lifeline-scale";
import type { LifelinePointView } from "./lifeline-view";

/** One event on PersonLifeline's axis: dot, stem and the year/caption
 *  label, alternating above and below. Each part carries its entrance
 *  animation, timed by the dot's place on the axis (--lifeline-at). */
export function LifelineDot({
  point,
  pressed,
  onSelect,
}: {
  point: LifelinePointView;
  pressed: boolean;
  onSelect: (dot: HTMLElement) => void;
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
      className={`${edge} ${up ? "lifeline-label-up" : "lifeline-label-down"} rounded-lg px-1.5 py-0.5 leading-[1.3] whitespace-nowrap transition-colors duration-base ease-(--ease-reveal) group-hover:bg-glass`}
    >
      <b
        className={`block text-sm font-medium tabular-nums ${pressed ? "text-primary" : ""}`}
      >
        {point.year}
      </b>
      <small className="text-xs text-foreground/55">{point.caption}</small>
    </span>
  );
  const stem = (
    <span className={`lifeline-stem w-px bg-branch ${up ? "h-5" : "h-6"}`} />
  );
  const dot = (
    <span
      className={`lifeline-dot size-[11px] rounded-full border-2 transition-transform duration-base ease-(--ease-reveal) group-hover:scale-125 ${
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
      onClick={(e) => onSelect(e.currentTarget)}
      // Label first in the DOM on both sides (so it gets the focus ring);
      // below the axis the column simply runs bottom-up, dot on the axis.
      // scroll-mx: a picked dot scrolled into view clears the edge fade.
      className={`group absolute flex w-0 -translate-x-1/2 scroll-mx-20 cursor-pointer items-center gap-1 focus-visible:outline-none [&:focus-visible>span:first-child]:ring-2 [&:focus-visible>span:first-child]:ring-ring ${
        up ? "bottom-29.5 flex-col" : "top-30.25 flex-col-reverse"
      }`}
      style={axisStyle(point.position)}
    >
      {label}
      {stem}
      {dot}
    </button>
  );
}

/** A span fraction → its place on the axis: CSS left (the end dots sit
 *  LIFELINE_INSET in from the track edges, everything else on one linear
 *  scale between them) plus --lifeline-at for the entrance timing. */
export function axisStyle(fraction: number): CSSProperties {
  return {
    left: `calc(${LIFELINE_INSET}px + ${fraction} * (100% - ${2 * LIFELINE_INSET}px))`,
    ["--lifeline-at" as string]: fraction,
  };
}
