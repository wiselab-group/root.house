import type { EventType } from "@/domain/event/event.repository";
import type { GeoModel } from "./map-snapshot";

/**
 * A Place told by meaning — who was born here, who lived here and when,
 * who married, who died, what else happened — the family map's place sheet.
 * Structure only; the UI words it.
 */

export interface PlaceMoment {
  personIds: string[];
  year: number | null;
  eventId?: string;
  eventType?: EventType;
}

export interface PlaceLife {
  personId: string;
  from: number;
  /** False for a current residence nobody dated — «живёт здесь», no year. */
  fromKnown: boolean;
  /** Null = still lives here. */
  to: number | null;
}

export interface PlaceStory {
  /** The first year the family is known to be here. */
  since: number | null;
  /** Everyone with any link to the place. */
  personIds: string[];
  births: PlaceMoment[];
  lives: PlaceLife[];
  marriages: PlaceMoment[];
  deaths: PlaceMoment[];
  events: PlaceMoment[];
}

const byYear = (a: { year: number | null }, b: { year: number | null }) =>
  (a.year ?? Infinity) - (b.year ?? Infinity);

export function placeStory(model: GeoModel, placeId: string): PlaceStory {
  const stops = model.stops.filter((s) => s.placeId === placeId);
  const people = new Set<string>();
  const births: PlaceMoment[] = [];
  const deaths: PlaceMoment[] = [];
  const eventsById = new Map<string, PlaceMoment>();

  for (const s of stops) {
    if (s.personId) people.add(s.personId);
    if (s.kind === "birth" && s.personId) {
      births.push({ personIds: [s.personId], year: s.year });
    } else if (s.kind === "death" && s.personId) {
      deaths.push({ personIds: [s.personId], year: s.year });
    } else if (s.eventId && s.kind !== "move") {
      const moment = eventsById.get(s.eventId) ?? {
        personIds: [],
        year: s.year,
        eventId: s.eventId,
        eventType: s.eventType,
      };
      if (s.personId && !moment.personIds.includes(s.personId)) {
        moment.personIds.push(s.personId);
      }
      eventsById.set(s.eventId, moment);
    }
  }

  // «Жили» — stays that began with arriving here, not with being born here:
  // someone born here and still here is already told under «Родились».
  const lives: PlaceLife[] = model.stays
    .filter((s) => s.placeId === placeId && s.entry !== "birth")
    .map((s) => ({
      personId: s.personId,
      from: s.from,
      fromKnown: s.entry !== "residence",
      to: s.to,
    }))
    .sort((a, b) => a.from - b.from);
  for (const life of lives) people.add(life.personId);

  const events = [...eventsById.values()];
  const years = [
    ...stops.map((s) => s.year),
    ...lives.filter((l) => l.fromKnown).map((l) => l.from),
  ].filter((y): y is number => y !== null);

  return {
    since: years.length > 0 ? Math.min(...years) : null,
    personIds: [...people],
    births: births.sort(byYear),
    lives,
    marriages: events.filter((e) => e.eventType === "marriage").sort(byYear),
    deaths: deaths.sort(byYear),
    events: events.filter((e) => e.eventType !== "marriage").sort(byYear),
  };
}
