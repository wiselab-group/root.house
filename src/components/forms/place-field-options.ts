import {
  findMatchingPlace,
  normalizeName,
  type PlaceDraft,
} from "@/domain/place/place-draft";
import type { PlaceRecord } from "@/domain/place/place.service";
import type { GeocodeResult } from "@/lib/maptiler-geocode";

/** What a PlaceField currently holds — posted as `<name>` or `<name>Draft`. */
export type PlaceSelection =
  { kind: "saved"; place: PlaceRecord } | { kind: "draft"; draft: PlaceDraft };

export type PlaceOption =
  | { key: string; kind: "saved"; place: PlaceRecord }
  | { key: string; kind: "map"; result: GeocodeResult }
  | { key: string; kind: "typed"; name: string };

export interface PlaceOptionGroup {
  /** The UI names the group from this (messages `placeForm.group*`). */
  value: "saved" | "map" | "typed";
  items: PlaceOption[];
}

/**
 * The dropdown under a PlaceField: the family's own places first (instant,
 * filtered locally), then map search results, then «add as typed» for a
 * place the map doesn't know. The typed option is offered only when no
 * saved place already has exactly that name — picking it would just
 * resolve to that place anyway.
 */
export function buildPlaceOptionGroups(
  places: PlaceRecord[],
  query: string,
  mapResults: GeocodeResult[],
): PlaceOptionGroup[] {
  const key = normalizeName(query);
  const saved = key
    ? places.filter((place) => normalizeName(place.name).includes(key))
    : places;
  const hasExactSaved = saved.some(
    (place) => normalizeName(place.name) === key,
  );

  const groups: PlaceOptionGroup[] = [
    {
      value: "saved",
      items: saved.map((place) => ({
        key: `saved:${place.id}`,
        kind: "saved",
        place,
      })),
    },
    {
      value: "map",
      // A result the family already has (same name, nearby) is shown only
      // once — under «В архиве семьи»; the action would reuse it anyway.
      items: key
        ? mapResults
            .filter(
              (result) => !findMatchingPlace(places, draftFromResult(result)),
            )
            .map((result) => ({ key: `map:${result.id}`, kind: "map", result }))
        : [],
    },
    {
      value: "typed",
      items:
        key && !hasExactSaved
          ? [{ key: "typed", kind: "typed", name: query.trim() }]
          : [],
    },
  ];
  return groups.filter((group) => group.items.length > 0);
}

export function selectionFromOption(option: PlaceOption): PlaceSelection {
  switch (option.kind) {
    case "saved":
      return { kind: "saved", place: option.place };
    case "map":
      return { kind: "draft", draft: draftFromResult(option.result) };
    case "typed":
      return {
        kind: "draft",
        draft: {
          name: option.name,
          region: null,
          country: null,
          latitude: null,
          longitude: null,
        },
      };
  }
}

function draftFromResult(result: GeocodeResult): PlaceDraft {
  return {
    name: result.name,
    region: result.region,
    country: result.country,
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

export function selectionName(selection: PlaceSelection | null): string {
  if (!selection) return "";
  return selection.kind === "saved"
    ? selection.place.name
    : selection.draft.name;
}

/** The muted second line under an option — where on the map it is. Null
 *  for a typed-in name: the UI shows its own «no map point yet» hint. */
export function placeOptionDetail(option: PlaceOption): string | null {
  switch (option.kind) {
    case "saved":
      return (
        [option.place.region, option.place.country]
          .filter(Boolean)
          .join(", ") || null
      );
    case "map":
      return (
        [option.result.region, option.result.country]
          .filter(Boolean)
          .join(", ") || null
      );
    case "typed":
      return null;
  }
}
