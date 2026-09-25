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
  latitude: number;
  longitude: number;
}

interface MapTilerFeature {
  id: string;
  place_name_ru?: string;
  place_name?: string;
  center: [number, number];
}

interface MapTilerGeocodeResponse {
  features?: MapTilerFeature[];
}

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

  const response = await fetch(url.toString(), { signal });
  if (!response.ok) return [];

  const data = (await response.json()) as MapTilerGeocodeResponse;
  return (data.features ?? []).map((feature) => ({
    id: feature.id,
    label: feature.place_name_ru ?? feature.place_name ?? trimmed,
    longitude: feature.center[0],
    latitude: feature.center[1],
  }));
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
