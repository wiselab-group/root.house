"use client";

import { useState } from "react";

interface Point {
  xPercent: number;
  yPercent: number;
}

/**
 * Spotlight over a photo in the lightbox: hovering a tagged person's chip
 * dims the whole photo except a soft circle around their tag (user
 * request). The circle's size follows the photo (container query units on
 * PhotoTagLayer's box), so it frames a face in a group portrait at any
 * lightbox size. The dim fades in/out on opacity, and moving between
 * chips glides the light across — --spot-x/--spot-y are registered
 * @property percentages in globals.css, so the mask position itself
 * transitions instead of jumping.
 *
 * Many small faces (a school class, a wedding row): the circle is capped at
 * a bit under half the distance to the nearest OTHER tag on the photo, so
 * in a dense row it shrinks to about one face instead of lighting three
 * neighbours; a lone tag keeps the full size. The distance is worked out
 * in CSS — hypot() over cq units of the photo frame — so it's right at any
 * window shape, and min() over every other tag picks the nearest.
 *
 * Stays mounted with the last point while fading out, so the light doesn't
 * snap to the corner on its way out.
 */
export function PhotoTagSpotlight({
  point,
  others,
}: {
  point: Point | null;
  /** Every other positioned tag on this photo — they set the size cap. */
  others: Point[];
}) {
  const [lastPoint, setLastPoint] = useState<Point | null>(point);
  if (point && point !== lastPoint) setLastPoint(point);
  const shown = point ?? lastPoint;
  const neighbours = shown
    ? others.filter(
        (other) =>
          other.xPercent !== shown.xPercent ||
          other.yPercent !== shown.yPercent,
      )
    : [];

  return (
    <div
      aria-hidden="true"
      className={`photo-tag-spotlight pointer-events-none absolute inset-0 bg-background/65 transition-[opacity,--spot-x,--spot-y,--spot-cap] duration-500 ease-(--ease-reveal) ${
        point ? "opacity-100" : "opacity-0"
      }`}
      style={
        shown
          ? ({
              "--spot-x": `${shown.xPercent}%`,
              "--spot-y": `${shown.yPercent}%`,
              ...(neighbours.length > 0 && {
                "--spot-cap": spotCap(shown, neighbours),
              }),
            } as React.CSSProperties)
          : undefined
      }
    />
  );
}

/** 45% of the distance to the nearest neighbour — the fully lit circle
 *  stops short of the midpoint, and the feather (to 2×, globals.css) fades
 *  to dark right around the neighbour's own face. Floored so two tags
 *  almost on top of each other still get a visible light. */
function spotCap(point: Point, neighbours: Point[]): string {
  const distances = neighbours.map(
    (other) =>
      `hypot(${other.xPercent - point.xPercent} * 1cqw, ${other.yPercent - point.yPercent} * 1cqh)`,
  );
  return `max(3cqmin, min(${distances.join(", ")}) * 0.45)`;
}
