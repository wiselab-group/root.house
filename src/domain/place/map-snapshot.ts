import type { EventType } from "@/domain/event/event.repository";
import type { PlaceStop, Route, Stay, StopKind } from "./geo-chronology";
import { compareStops } from "./geo-chronology";

/**
 * What the family map shows at one moment — a year on the timeline, or
 * «Всё время». Pure and cheap enough to recompute every animation frame
 * while the timeline plays (the client calls it with fractional years).
 */

export type MapMoment = number | "all";

/** Years a move takes to draw in while playing (~0.6 s at 8 years/s). */
export const ROUTE_DRAW_YEARS = 5;
/** A move this recent is drawn as the fresh one, older ones go quiet. */
export const ROUTE_RECENT_YEARS = 6;

export interface GeoModel {
  currentYear: number;
  stops: PlaceStop[];
  stays: Stay[];
  routes: Route[];
  /** Generation rank by person id (family-branches.ts::computeGenerations). */
  generations: Record<string, number>;
  birthYears: Record<string, number | null>;
  countryByPlaceId: Record<string, string | null>;
}

export type PlaceState = "present" | "past";

export interface PlacePresence {
  state: PlaceState;
  /** Who is there at this moment (empty for «past»). */
  personIds: string[];
}

export interface RouteView {
  route: Route;
  /** 0..1 — how much of the arc is drawn. */
  progress: number;
  recent: boolean;
}

export interface MapStats {
  generations: number;
  places: number;
  countries: number;
}

export interface MapSnapshot {
  places: Map<string, PlacePresence>;
  routes: RouteView[];
  stats: MapStats;
}

/**
 * `drawing` — the timeline is playing: a move draws itself in over its
 * first ROUTE_DRAW_YEARS. A year picked by hand shows its moves whole.
 */
export function snapshotAt(
  model: GeoModel,
  moment: MapMoment,
  drawing = false,
): MapSnapshot {
  const places = new Map<string, PlacePresence>();
  const all = moment === "all";
  const year = all ? model.currentYear : moment;

  for (const stay of model.stays) {
    const here = all
      ? stay.to === null
      : stay.from <= year && (stay.to === null || stay.to > year);
    if (!here) continue;
    const entry = places.get(stay.placeId) ?? {
      state: "present" as const,
      personIds: [],
    };
    if (!entry.personIds.includes(stay.personId)) {
      entry.personIds.push(stay.personId);
    }
    places.set(stay.placeId, entry);
  }
  for (const stop of model.stops) {
    if (places.has(stop.placeId)) continue;
    const reached = all || (stop.year !== null && stop.year <= year);
    if (reached) places.set(stop.placeId, { state: "past", personIds: [] });
  }

  const routes: RouteView[] = [];
  for (const route of model.routes) {
    if (all) {
      routes.push({ route, progress: 1, recent: false });
      continue;
    }
    const at = route.year ?? model.currentYear;
    if (at > year) continue;
    const age = year - at;
    routes.push({
      route,
      progress: drawing ? Math.min(1, age / ROUTE_DRAW_YEARS) : 1,
      recent: age < ROUTE_RECENT_YEARS,
    });
  }

  const ranks = new Set<number>();
  for (const [personId, rank] of Object.entries(model.generations)) {
    if (all || isBornBy(model, personId, year)) ranks.add(rank);
  }
  const countries = new Set<string>();
  for (const placeId of places.keys()) {
    const country = model.countryByPlaceId[placeId];
    if (country) countries.add(country.trim().toLowerCase());
  }

  return {
    places,
    routes,
    stats: {
      generations: ranks.size,
      places: places.size,
      countries: countries.size,
    },
  };
}

/** Born by `year` — by the birth year, or, when that is unknown, by the
 *  first dated trace the person left anywhere. */
function isBornBy(model: GeoModel, personId: string, year: number): boolean {
  const born = model.birthYears[personId];
  if (born != null) return born <= year;
  return model.stops.some(
    (s) => s.personId === personId && s.year !== null && s.year <= year,
  );
}

export interface TimelineRange {
  from: number;
  to: number;
  /** Dated stops per year, for the slider's density marks. */
  density: Record<number, number>;
  /** Stops with a place but no year — not on the timeline. */
  undated: number;
}

export function timelineRange(model: GeoModel): TimelineRange | null {
  const density: Record<number, number> = {};
  let from = Number.POSITIVE_INFINITY;
  let undated = 0;
  for (const s of model.stops) {
    if (s.year === null) {
      if (s.kind !== "residence") undated++;
      continue;
    }
    density[s.year] = (density[s.year] ?? 0) + 1;
    from = Math.min(from, s.year);
  }
  if (!Number.isFinite(from)) return null;
  return { from, to: Math.max(from, model.currentYear), density, undated };
}

/** One line of the timeline's feed: «1967 · Галина переезжает в Киев». */
export interface FeedItem {
  key: string;
  year: number;
  kind: StopKind;
  eventId?: string;
  eventType?: EventType;
  placeId: string;
  /** For a move: where the first mover came from, when known. */
  fromPlaceId: string | null;
  personIds: string[];
}

/** Every dated stop as a story beat, oldest first; one Event = one beat,
 *  however many people took part in it. */
export function buildFeed(model: GeoModel): FeedItem[] {
  const previousPlace = new Map<string, string>();
  const staysByPerson = new Map<string, Stay[]>();
  for (const stay of model.stays) {
    const list = staysByPerson.get(stay.personId) ?? [];
    list.push(stay);
    staysByPerson.set(stay.personId, list);
  }
  for (const list of staysByPerson.values()) {
    for (let i = 1; i < list.length; i++) {
      const s = list[i];
      previousPlace.set(
        `${s.personId}|${s.placeId}|${s.from}`,
        list[i - 1].placeId,
      );
    }
  }

  const items = new Map<string, FeedItem>();
  const dated = model.stops.filter((s) => s.year !== null).sort(compareStops);
  for (const stop of dated) {
    const key = stop.eventId
      ? `e:${stop.eventId}`
      : `${stop.kind}:${stop.personId}`;
    const item = items.get(key);
    if (item) {
      if (stop.personId && !item.personIds.includes(stop.personId)) {
        item.personIds.push(stop.personId);
      }
      continue;
    }
    items.set(key, {
      key,
      year: stop.year as number,
      kind: stop.kind,
      eventId: stop.eventId,
      eventType: stop.eventType,
      placeId: stop.placeId,
      fromPlaceId:
        stop.kind === "move" && stop.personId
          ? (previousPlace.get(
              `${stop.personId}|${stop.placeId}|${stop.year}`,
            ) ?? null)
          : null,
      personIds: stop.personId ? [stop.personId] : [],
    });
  }
  return [...items.values()];
}

/** The latest feed item at or before `year` — the one the map captions. */
export function feedItemAt(
  feed: readonly FeedItem[],
  year: number,
): FeedItem | undefined {
  return feed.findLast((item) => item.year <= year);
}

/** Where the living members of the family are now, most people first. */
export function currentPlaces(
  model: GeoModel,
): { placeId: string; personIds: string[] }[] {
  const now = snapshotAt(model, "all");
  return [...now.places.entries()]
    .filter(([, p]) => p.state === "present")
    .map(([placeId, p]) => ({ placeId, personIds: p.personIds }))
    .sort((a, b) => b.personIds.length - a.personIds.length);
}

/** A group of people's places in the order the family first reached them,
 *  and the routes they travelled — a branch's or a person's path. */
export function pathOf(
  model: GeoModel,
  personIds: ReadonlySet<string>,
): { placeIds: string[]; routeIds: Set<string> } {
  const stays = model.stays
    .filter((s) => personIds.has(s.personId))
    .sort((a, b) => a.from - b.from);
  const placeIds: string[] = [];
  for (const s of stays) {
    if (!placeIds.includes(s.placeId)) placeIds.push(s.placeId);
  }
  const routeIds = new Set(
    model.routes
      .filter((r) => r.personIds.some((id) => personIds.has(id)))
      .map((r) => r.id),
  );
  return { placeIds, routeIds };
}
