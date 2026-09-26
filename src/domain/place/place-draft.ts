import type { PlaceRecord } from "./place.repository";

/**
 * A Place the user picked in a form's place field that isn't saved yet —
 * a map search result (with coordinates) or a bare name typed in for a
 * place the map doesn't know («хутор под Гродно»). The form's action turns
 * it into a real Place on save (see place.service.ts::resolvePlaceChoice),
 * so adding a place never needs a detour through the Places page.
 */
export interface PlaceDraft {
  name: string;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** Two pins this close with the same name are the same town, not namesakes. */
const SAME_PLACE_RADIUS_KM = 25;

/**
 * The already-saved Place a draft refers to, if any — so picking «Таллинн»
 * from the map a second time reuses the family's existing Таллинн instead
 * of creating a duplicate. Same name (case/whitespace-insensitive) is
 * required; when both sides have coordinates they must also be close, so
 * namesakes (Кировск in Ленинградская vs Мурманская область) stay apart.
 * A saved place without coordinates matches by name alone — it's most
 * likely the same place, recorded before it had a pin.
 */
export function findMatchingPlace(
  places: PlaceRecord[],
  draft: PlaceDraft,
): PlaceRecord | null {
  const key = normalizeName(draft.name);
  const namesakes = places.filter((place) => normalizeName(place.name) === key);
  if (draft.latitude === null || draft.longitude === null) {
    return namesakes[0] ?? null;
  }
  const draftPoint = { latitude: draft.latitude, longitude: draft.longitude };
  return (
    namesakes.find(
      (place) =>
        place.latitude === null ||
        place.longitude === null ||
        distanceKm(draftPoint, {
          latitude: place.latitude,
          longitude: place.longitude,
        }) <= SAME_PLACE_RADIUS_KM,
    ) ?? null
  );
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru");
}

type Point = { latitude: number; longitude: number };

/** Great-circle distance (haversine) — plenty precise for a 25 km check. */
function distanceKm(a: Point, b: Point): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
