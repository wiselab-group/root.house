import type { CSSProperties } from "react";
import { LIFELINE_INSET } from "@/domain/event/lifeline-scale";

export interface ScalePoint {
  year: number;
  caption: string;
  /** Place on the axis, 0..1 — spread like layoutLifelineScale spreads
   *  close years so their labels never touch. */
  at: number;
  side: "up" | "down";
  align: "start" | "center" | "end";
}

/** lifeline-dot.tsx's axisStyle: the end dots LIFELINE_INSET in from the
 *  track's ends, everything else on one scale between them. */
function axis(at: number): CSSProperties {
  return {
    left: `calc(${LIFELINE_INSET}px + ${at} * (100% - ${2 * LIFELINE_INSET}px))`,
  };
}

/**
 * PersonLifeline's axis as plain markup (person-lifeline.tsx +
 * lifeline-dot.tsx, same classes and offsets): the sage track, dots with
 * their stems and year/caption labels alternating above and below, the
 * selected one in terracotta, and the decades under it. No entrance
 * animation — the panel may mount long before it's looked at.
 */
export function LifelineScale({
  points,
  selected,
  decades,
}: {
  points: readonly ScalePoint[];
  selected: number;
  decades: readonly { year: number; at: number }[];
}) {
  return (
    <div className="relative h-[250px]">
      <div
        className="absolute top-[122px] h-2.5 rounded-full bg-tree-accent/80"
        style={{ left: LIFELINE_INSET - 5, right: LIFELINE_INSET - 5 }}
      />
      {points.map((point, index) => {
        const up = point.side === "up";
        const pressed = index === selected;
        const edge =
          point.align === "start"
            ? "-ml-1.5 self-start text-left"
            : point.align === "end"
              ? "-mr-1.5 self-end text-right"
              : "text-center";
        return (
          <span
            key={point.year}
            className={`absolute flex w-0 -translate-x-1/2 items-center gap-1 ${
              up ? "bottom-29.5 flex-col" : "top-30.25 flex-col-reverse"
            }`}
            style={axis(point.at)}
          >
            <span
              className={`${edge} rounded-lg px-1.5 py-0.5 leading-[1.3] whitespace-nowrap`}
            >
              <b
                className={`block text-sm font-medium tabular-nums ${pressed ? "text-primary" : ""}`}
              >
                {point.year}
              </b>
              <small className="text-xs text-foreground/55">
                {point.caption}
              </small>
            </span>
            <span className={`w-px bg-branch ${up ? "h-5" : "h-6"}`} />
            <span
              className={`size-[11px] rounded-full border-2 ${
                pressed
                  ? "border-primary bg-primary shadow-[0_0_0_5px_color-mix(in_oklch,var(--primary)_25%,transparent)]"
                  : "border-tree-accent bg-card"
              }`}
            />
          </span>
        );
      })}
      {decades.map((decade) => (
        <span
          key={decade.year}
          className="absolute top-[232px] -translate-x-1/2 text-[11px] text-foreground/35 tabular-nums"
          style={axis(decade.at)}
        >
          {decade.year}
        </span>
      ))}
    </div>
  );
}
