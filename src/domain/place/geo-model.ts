import {
  buildRoutes,
  buildStops,
  staysOf,
  stopsByPerson,
  type ChronoEvent,
  type ChronoPerson,
  type Stay,
} from "./geo-chronology";
import {
  computeGenerations,
  type ParentChildEdge,
  type PartnerEdge,
} from "./family-branches";
import type { GeoModel } from "./map-snapshot";

export interface GeoModelInput {
  persons: readonly ChronoPerson[];
  events: readonly ChronoEvent[];
  /** Only places that can be drawn — stops elsewhere are dropped. */
  places: readonly { id: string; country: string | null }[];
  parentChild: readonly ParentChildEdge[];
  partners: readonly PartnerEdge[];
  currentYear: number;
}

/** Assembles the map's whole model from already privacy-filtered facts. */
export function buildGeoModel(input: GeoModelInput): GeoModel {
  const drawable = new Set(input.places.map((p) => p.id));
  const stops = buildStops(input.persons, input.events).filter((s) =>
    drawable.has(s.placeId),
  );
  const byPerson = stopsByPerson(stops);
  const stays: Stay[] = [];
  for (const person of input.persons) {
    stays.push(
      ...staysOf(person, byPerson.get(person.id) ?? [], input.currentYear),
    );
  }
  const generations = computeGenerations(
    input.persons.map((p) => p.id),
    input.parentChild,
    input.partners,
  );
  return {
    currentYear: input.currentYear,
    stops,
    stays,
    routes: buildRoutes(stays),
    generations: Object.fromEntries(generations),
    birthYears: Object.fromEntries(
      input.persons.map((p) => [p.id, p.birthYear]),
    ),
    countryByPlaceId: Object.fromEntries(
      input.places.map((p) => [p.id, p.country]),
    ),
  };
}
