import {
  createPlace,
  deletePlace,
  getPlaceById,
  listPlacesByFamily,
  type CreatePlaceData,
  type PlaceRecord,
} from "./place.repository";

export type { PlaceRecord };

export async function addPlace(data: CreatePlaceData): Promise<{ id: string }> {
  return createPlace(data);
}

export async function getPlace(placeId: string, familyId: string): Promise<PlaceRecord | null> {
  return getPlaceById(placeId, familyId);
}

export async function listPlaces(familyId: string): Promise<PlaceRecord[]> {
  return listPlacesByFamily(familyId);
}

export async function removePlace(placeId: string, familyId: string): Promise<boolean> {
  return deletePlace(placeId, familyId);
}
