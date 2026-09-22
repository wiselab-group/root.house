/**
 * Thin client for MapTiler's Geocoding API (https://api.maptiler.com/geocoding)
 * — forward geocoding only (address/place name → coordinates), used by
 * PlaceGeocodeCombobox to resolve a Place's latitude/longitude from a
 * free-text search. Runs client-side (the "use client" combobox calls this
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
