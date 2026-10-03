"use client";

import { Marker } from "react-map-gl/maplibre";
import { cn } from "@/lib/utils";

/**
 * - present — family is here at this moment (sage, «это люди»)
 * - past — the family was here before (sage outline, faded)
 * - bare — a place nothing is linked to yet
 * - selected / trace — what the user is looking at (terracotta, as in the tree)
 * - dim — off the lit path
 */
export type PinTone =
  "present" | "past" | "bare" | "selected" | "trace" | "dim";

const DOT: Record<PinTone, string> = {
  present:
    "size-8 bg-tree-accent text-background shadow-lg shadow-black/30 ring-2 ring-background",
  past: "size-5 border-2 border-tree-accent bg-background/70",
  bare: "size-3.5 border-2 border-tree-accent/60 bg-background/60",
  selected:
    "size-10 bg-primary text-primary-foreground ring-4 ring-primary/30 shadow-lg shadow-black/30",
  trace:
    "size-8 bg-primary text-primary-foreground ring-2 ring-background shadow-lg shadow-black/30",
  dim: "size-3 bg-tree-accent/45",
};

/** One place on the family map: a dot, its name, and — on hover or
 *  keyboard focus — a short «who/since» line before any click. */
export function PlacePin({
  longitude,
  latitude,
  name,
  tone,
  badge,
  hint,
  onSelect,
}: {
  longitude: number;
  latitude: number;
  name: string;
  tone: PinTone;
  /** A count (present) or the stop's number (a person's path). */
  badge?: string;
  /** «4 человека · с 1967» — shown on hover. */
  hint?: string;
  onSelect: () => void;
}) {
  const quiet = tone === "dim" || tone === "bare" || tone === "past";
  return (
    <Marker
      longitude={longitude}
      latitude={latitude}
      anchor="center"
      style={{
        zIndex: tone === "selected" || tone === "trace" ? 2 : quiet ? 0 : 1,
      }}
      onClick={(e) => {
        // react-map-gl listens on MapLibre's own marker element, not via
        // React bubbling — stop the click from also reaching the map.
        e.originalEvent.stopPropagation();
        onSelect();
      }}
    >
      <button
        type="button"
        aria-label={hint ? `${name} · ${hint}` : name}
        className="group relative flex cursor-pointer items-center outline-none"
      >
        <span
          className={cn(
            "flex items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-transform duration-base ease-(--ease-spring) group-hover:scale-110 group-focus-visible:scale-110 group-focus-visible:ring-4 group-focus-visible:ring-ring/50",
            DOT[tone],
          )}
        >
          {badge}
        </span>
        <span
          className={cn(
            "absolute left-full ml-2 rounded-full bg-card/85 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-card-foreground shadow-sm shadow-black/20",
            quiet && "opacity-70",
            tone === "dim" && "opacity-0 group-hover:opacity-100",
          )}
        >
          {name}
        </span>
        {hint && (
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 translate-y-1 rounded-lg bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap text-popover-foreground opacity-0 shadow-lg shadow-black/30 transition-[opacity,transform] duration-base ease-(--ease-reveal) group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
          >
            {hint}
          </span>
        )}
      </button>
    </Marker>
  );
}
