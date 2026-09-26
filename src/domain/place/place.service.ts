import {
  createPlace,
  deletePlace,
  getPlaceById,
  listPlacesByFamily,
  updatePlace,
  type CreatePlaceData,
  type PlaceRecord,
  type UpdatePlaceData,
} from "./place.repository";
import { findMatchingPlace, type PlaceDraft } from "./place-draft";

export type { PlaceRecord, PlaceDraft };

export async function addPlace(data: CreatePlaceData): Promise<{ id: string }> {
  return createPlace(data);
}

export async function editPlace(
  placeId: string,
  familyId: string,
  data: UpdatePlaceData,
): Promise<boolean> {
  return updatePlace(placeId, familyId, data);
}

export async function getPlace(
  placeId: string,
  familyId: string,
): Promise<PlaceRecord | null> {
  return getPlaceById(placeId, familyId);
}

export async function listPlaces(familyId: string): Promise<PlaceRecord[]> {
  return listPlacesByFamily(familyId);
}

export async function removePlace(
  placeId: string,
  familyId: string,
): Promise<boolean> {
  return deletePlace(placeId, familyId);
}

/** What a form's place field submitted: an already-saved Place, or a new one to save. */
export interface PlaceChoice {
  placeId: string | null;
  draft: PlaceDraft | null;
}

/**
 * Turns a form's place field into the Place id to store — creating the
 * Place on the spot when the user picked a map result or typed a new name,
 * so a place never has to be added on the Places page first. A draft that
 * matches a place the family already has reuses it (findMatchingPlace)
 * instead of creating a duplicate. A submitted `placeId` is re-checked
 * against the family (never trusted from the client) and dropped if it
 * doesn't belong to it.
 *
 * Deliberately not gated on the "editor" role that the Places page itself
 * requires: a contributor adding an event must be able to say where it
 * happened, and a Place carries nothing private of its own (see
 * place-marker.service.ts). Callers authorize the surrounding write.
 */
export async function resolvePlaceChoice(
  familyId: string,
  choice: PlaceChoice,
): Promise<{ placeId: string | null; created: boolean }> {
  if (choice.draft) {
    const existing = findMatchingPlace(
      await listPlacesByFamily(familyId),
      choice.draft,
    );
    if (existing) return { placeId: existing.id, created: false };
    const { id } = await createPlace({ familyId, ...choice.draft });
    return { placeId: id, created: true };
  }
  if (choice.placeId) {
    const place = await getPlaceById(choice.placeId, familyId);
    return { placeId: place?.id ?? null, created: false };
  }
  return { placeId: null, created: false };
}
