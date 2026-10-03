import type { EventType } from "@/domain/event/event.repository";

/**
 * Geo-chronology — where the family was, and when. Pure functions over the
 * archive's existing facts (no table of its own): a Person's birth/death/
 * current-residence Place and every Event that has a Place (a "migration"
 * or "emigration" Event is a move TO its place; where from is simply the
 * previous stop of that Person's own chronology). The family map's
 * timeline, routes, branches and place sheet are all views of this.
 */

export interface ChronoPerson {
  id: string;
  isLiving: boolean;
  birthYear: number | null;
  deathYear: number | null;
  birthPlaceId: string | null;
  deathPlaceId: string | null;
  /** Only meaningful while living — the profile's «живёт в …». */
  residencePlaceId: string | null;
}

export interface ChronoEvent {
  id: string;
  type: EventType;
  year: number | null;
  placeId: string;
  participantIds: string[];
}

export type StopKind = "birth" | "move" | "event" | "death" | "residence";

export interface PlaceStop {
  /** Null for an Event nobody is attached to — it still happened here. */
  personId: string | null;
  placeId: string;
  /** Null when unknown — such a stop is off the timeline, «Всё время» only. */
  year: number | null;
  kind: StopKind;
  eventId?: string;
  eventType?: EventType;
}

/** An unknown death of a non-living person: presence fades this many years
 *  after their last dated stop (or birth), instead of lasting forever. */
export const ASSUMED_LIFESPAN = 75;

const MOVE_TYPES: ReadonlySet<EventType> = new Set(["migration", "emigration"]);
// Same-year stops: born before anything else, died after everything else.
const KIND_ORDER: Record<StopKind, number> = {
  birth: 0,
  move: 1,
  event: 2,
  residence: 3,
  death: 4,
};

export function buildStops(
  persons: readonly ChronoPerson[],
  events: readonly ChronoEvent[],
): PlaceStop[] {
  const stops: PlaceStop[] = [];
  for (const p of persons) {
    if (p.birthPlaceId) {
      stops.push({
        personId: p.id,
        placeId: p.birthPlaceId,
        year: p.birthYear,
        kind: "birth",
      });
    }
    if (p.deathPlaceId && !p.isLiving) {
      stops.push({
        personId: p.id,
        placeId: p.deathPlaceId,
        year: p.deathYear,
        kind: "death",
      });
    }
    if (p.residencePlaceId && p.isLiving) {
      stops.push({
        personId: p.id,
        placeId: p.residencePlaceId,
        year: null,
        kind: "residence",
      });
    }
  }
  for (const e of events) {
    const kind: StopKind = MOVE_TYPES.has(e.type) ? "move" : "event";
    const base = {
      placeId: e.placeId,
      year: e.year,
      kind,
      eventId: e.id,
      eventType: e.type,
    };
    if (e.participantIds.length === 0) {
      stops.push({ ...base, personId: null });
      continue;
    }
    for (const personId of e.participantIds) stops.push({ ...base, personId });
  }
  return stops;
}

export function compareStops(a: PlaceStop, b: PlaceStop): number {
  const ya = a.year ?? Number.POSITIVE_INFINITY;
  const yb = b.year ?? Number.POSITIVE_INFINITY;
  if (ya !== yb) return ya - yb;
  return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
}

/** A stretch of a person's life spent in one place. `to` null = still there. */
export interface Stay {
  personId: string;
  placeId: string;
  from: number;
  to: number | null;
  /** How the stay began — a birth there, a move, an event, the residence. */
  entry: StopKind;
}

/**
 * One person's stays, oldest first: each dated stop that changes place opens
 * a new stay and closes the previous one. The current residence (no year)
 * closes the chronology at `currentYear` when it differs from the last
 * dated place. The last stay ends at death, at «today» for the living, or
 * ASSUMED_LIFESPAN after birth/last stop for the dead with no death year.
 */
export function staysOf(
  person: ChronoPerson,
  personStops: readonly PlaceStop[],
  currentYear: number,
): Stay[] {
  const dated = personStops.filter((s) => s.year !== null).sort(compareStops);
  const stays: Stay[] = [];
  for (const stop of dated) {
    const year = stop.year as number;
    const last = stays.at(-1);
    if (last && last.placeId === stop.placeId) continue;
    if (last) last.to = year;
    stays.push({
      personId: person.id,
      placeId: stop.placeId,
      from: year,
      to: null,
      entry: stop.kind,
    });
  }
  const residence = personStops.find((s) => s.kind === "residence");
  const last = stays.at(-1);
  if (residence && (!last || last.placeId !== residence.placeId)) {
    // Moved in at some unknown point — shown from today, never back-dated.
    if (last) last.to = currentYear;
    stays.push({
      personId: person.id,
      placeId: residence.placeId,
      from: currentYear,
      to: null,
      entry: "residence",
    });
  }
  const tail = stays.at(-1);
  if (tail && !person.isLiving) {
    const lastYear = dated.at(-1)?.year ?? tail.from;
    tail.to =
      person.deathYear ??
      Math.min(
        currentYear,
        Math.max(lastYear, (person.birthYear ?? tail.from) + ASSUMED_LIFESPAN),
      );
  }
  return stays;
}

/** Stops grouped by person, in input order. Event stops with no person are skipped. */
export function stopsByPerson(
  stops: readonly PlaceStop[],
): Map<string, PlaceStop[]> {
  const byPerson = new Map<string, PlaceStop[]>();
  for (const s of stops) {
    if (!s.personId) continue;
    const list = byPerson.get(s.personId) ?? [];
    list.push(s);
    byPerson.set(s.personId, list);
  }
  return byPerson;
}

/** A move drawn on the map: one per from→to pair, however many made it. */
export interface Route {
  id: string;
  fromPlaceId: string;
  toPlaceId: string;
  /** The earliest crossing; null only for a move into a current residence. */
  year: number | null;
  personIds: string[];
}

/** Every place change in every person's stays, merged per from→to pair. */
export function buildRoutes(stays: readonly Stay[]): Route[] {
  const routes = new Map<string, Route>();
  const byPerson = new Map<string, Stay[]>();
  for (const stay of stays) {
    const list = byPerson.get(stay.personId) ?? [];
    list.push(stay);
    byPerson.set(stay.personId, list);
  }
  for (const list of byPerson.values()) {
    for (let i = 1; i < list.length; i++) {
      const from = list[i - 1];
      const to = list[i];
      const id = `${from.placeId}>${to.placeId}`;
      const year = to.entry === "residence" ? null : to.from;
      const route = routes.get(id);
      if (!route) {
        routes.set(id, {
          id,
          fromPlaceId: from.placeId,
          toPlaceId: to.placeId,
          year,
          personIds: [to.personId],
        });
        continue;
      }
      if (!route.personIds.includes(to.personId)) {
        route.personIds.push(to.personId);
      }
      if (year !== null && (route.year === null || year < route.year)) {
        route.year = year;
      }
    }
  }
  return [...routes.values()];
}
