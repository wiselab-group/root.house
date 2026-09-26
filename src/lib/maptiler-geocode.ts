/**
 * Thin client for MapTiler's Geocoding API (https://api.maptiler.com/geocoding)
 * — forward (address/place name → coordinates, PlaceGeocodeCombobox's
 * search) and reverse (a pin dropped on the map → its address, shown back
 * in the search box — see PlaceLocationField). Runs client-side (the "use client" combobox calls this
 * directly) since NEXT_PUBLIC_MAPTILER_API_KEY is already public — see
 * .env.local's own comment on why this key is safe to expose.
 */

export interface GeocodeResult {
  /** MapTiler's own feature id — not persisted, just a stable React key. */
  id: string;
  /** Full display label, e.g. "Пружаны, Брестская область, Беларусь". */
  label: string;
  /** The place's own short name ("Пружаны") — what a saved Place is called. */
  name: string;
  region: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
}

interface MapTilerContext {
  id: string;
  text?: string;
  text_ru?: string;
}

interface MapTilerFeature {
  id: string;
  text?: string;
  text_ru?: string;
  place_name_ru?: string;
  place_name?: string;
  center: [number, number];
  context?: MapTilerContext[];
}

interface MapTilerGeocodeResponse {
  features?: MapTilerFeature[];
}

const PLACE_SEARCH_TYPES = [
  "country",
  "region",
  "subregion",
  "county",
  "joint_municipality",
  "joint_submunicipality",
  "municipality",
  "municipal_district",
  "locality",
  "neighbourhood",
  "place",
  "address",
  "poi",
].join(",");

export async function geocodePlace(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
  if (!apiKey) return [];

  const url = new URL(
    `https://api.maptiler.com/geocoding/${encodeURIComponent(trimmed)}.json`,
  );
  url.searchParams.set("key", apiKey);
  url.searchParams.set("language", "ru");
  url.searchParams.set("limit", "6");
  // Everything a family story can happen at — settlements, regions,
  // addresses, landmarks — minus roads and postcodes, which only crowd a
  // «Таллинн» search with «Таллинн — Тарту — Выру» highways.
  url.searchParams.set("types", PLACE_SEARCH_TYPES);

  const response = await fetch(url.toString(), { signal });
  if (!response.ok) return [];

  const data = (await response.json()) as MapTilerGeocodeResponse;
  const results = (data.features ?? []).map((feature) =>
    toResult(feature, trimmed),
  );
  // A city and its same-named municipality come back as two features with
  // identical labels — indistinguishable to the user, so keep the first.
  return results.filter(
    (result, i) => results.findIndex((r) => r.label === result.label) === i,
  );
}

/** Context levels that read as "region" for a genealogy place, most specific-to-user first. */
const REGION_LEVELS = ["region", "subregion", "county"];

function toResult(feature: MapTilerFeature, query: string): GeocodeResult {
  const context = feature.context ?? [];
  const levelText = (level: string) => {
    const entry = context.find((item) => item.id.startsWith(`${level}.`));
    return entry ? (entry.text_ru ?? entry.text ?? null) : null;
  };
  const name =
    feature.text_ru ?? feature.text ?? feature.place_name_ru ?? query;
  const region =
    REGION_LEVELS.map(levelText).find((text) => text !== null) ?? null;
  const country = levelText("country");
  return {
    id: feature.id,
    // Built from the parts rather than place_name_ru, which trails off into
    // the continent («…, Эстония, Европа»).
    label: [name, region, country].filter(Boolean).join(", "),
    name,
    region,
    country,
    longitude: feature.center[0],
    latitude: feature.center[1],
  };
}

/** The nearest named place for a point — null when there's none (open sea) or the lookup fails. */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
  if (!apiKey) return null;

  const url = new URL(
    `https://api.maptiler.com/geocoding/${longitude},${latitude}.json`,
  );
  url.searchParams.set("key", apiKey);
  url.searchParams.set("language", "ru");
  url.searchParams.set("limit", "1");

  const response = await fetch(url.toString(), { signal }).catch(() => null);
  if (!response?.ok) return null;
  const data = (await response.json()) as MapTilerGeocodeResponse;
  const feature = data.features?.[0];
  return feature ? (feature.place_name_ru ?? feature.place_name ?? null) : null;
}
