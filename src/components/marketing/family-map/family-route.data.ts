import type { DemoPersonId } from "@/components/marketing/shared/hartley-family";
import { project, type LonLat } from "./map-geo";

export type CityId = "pskov" | "riga" | "tallinn" | "helsinki";

export const CITIES: Record<CityId, LonLat> = {
  pskov: [28.33, 57.82],
  riga: [24.1, 56.95],
  tallinn: [24.75, 59.44],
  helsinki: [24.94, 60.17],
};

/** Which side of its dot a city's name sits on, so labels clear the
 *  routes and each other. */
export const CITY_LABEL_SIDE: Record<CityId, "left" | "right"> = {
  pskov: "right",
  riga: "right",
  tallinn: "right",
  helsinki: "left",
};

export type RouteStop = {
  /** Key into `landing.map.stops.*`. */
  id: "s1928" | "s1931" | "s1950" | "s1956" | "s1989" | "s2016";
  year: number;
  city: CityId;
  /** Set when this stop is a move — the route draws from here. */
  from?: CityId;
  people: readonly DemoPersonId[];
};

/** The demo family's path, oldest first — the same story the hero, the
 *  voice recording and the tree tell. */
export const ROUTE_STOPS: readonly RouteStop[] = [
  { id: "s1928", year: 1928, city: "pskov", people: ["ivan"] },
  { id: "s1931", year: 1931, city: "riga", people: ["vera"] },
  { id: "s1950", year: 1950, city: "riga", from: "pskov", people: ["ivan"] },
  {
    id: "s1956",
    year: 1956,
    city: "tallinn",
    from: "riga",
    people: ["ivan", "vera", "paul"],
  },
  { id: "s1989", year: 1989, city: "tallinn", people: ["owen"] },
  {
    id: "s2016",
    year: 2016,
    city: "helsinki",
    from: "tallinn",
    people: ["lily"],
  },
];

export const YEAR_FROM = 1925;
export const YEAR_TO = 2026;
/** Years a move takes to draw while scrubbing. */
export const ROUTE_DRAW_YEARS = 6;

/** The map holds its first and last year for a moment at either end of
 *  the section's scroll, so it neither starts nor ends mid-journey. */
const HOLD_START = 0.06;
const HOLD_END = 0.12;
const SPAN = 1 - HOLD_START - HOLD_END;

/** Scroll progress (0..1) → year on the map, fractional. */
export function yearAtProgress(progress: number): number {
  const t = Math.min(Math.max((progress - HOLD_START) / SPAN, 0), 1);
  return YEAR_FROM + (YEAR_TO - YEAR_FROM) * t;
}

/** The inverse — where to scroll so the map shows `year`. */
export function progressForYear(year: number): number {
  return HOLD_START + ((year - YEAR_FROM) / (YEAR_TO - YEAR_FROM)) * SPAN;
}

/** A gentle arc from one city to another (quadratic, bowed to the right of
 *  the direction of travel). */
export function routePath(from: CityId, to: CityId): string {
  const a = project(CITIES[from]);
  const b = project(CITIES[to]);
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const bow = 0.18;
  const cx = mx - (b.y - a.y) * bow;
  const cy = my + (b.x - a.x) * bow;
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

/** The latest stop at or before `year`, if any. */
export function stopAt(year: number): RouteStop | undefined {
  return ROUTE_STOPS.findLast((stop) => stop.year <= year);
}
