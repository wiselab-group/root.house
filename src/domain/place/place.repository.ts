import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { places } from "@/db/schema";

export interface PlaceRecord {
  id: string;
  familyId: string;
  name: string;
  description: string | null;
  country: string | null;
  region: string | null;
  /** Nullable — a Place can exist purely as a text label (e.g. old records,
   *  or a vague/unresolved location) with no map pin. numeric columns come
   *  back as strings from the driver — parsed to number here so every
   *  consumer gets a real coordinate or null, never a string to re-parse. */
  latitude: number | null;
  longitude: number | null;
}

function toRecord(row: typeof places.$inferSelect): PlaceRecord {
  return {
    id: row.id,
    familyId: row.familyId,
    name: row.name,
    description: row.description,
    country: row.country,
    region: row.region,
    latitude: row.latitude !== null ? Number(row.latitude) : null,
    longitude: row.longitude !== null ? Number(row.longitude) : null,
  };
}

/** Fetches a Place scoped to a family in the same query — same IDOR-safe pattern as getPersonById. */
export async function getPlaceById(
  placeId: string,
  familyId: string,
): Promise<PlaceRecord | null> {
  const row = await db.query.places.findFirst({
    where: and(eq(places.id, placeId), eq(places.familyId, familyId)),
  });
  return row ? toRecord(row) : null;
}

export async function listPlacesByFamily(
  familyId: string,
): Promise<PlaceRecord[]> {
  const rows = await db.query.places.findMany({
    where: eq(places.familyId, familyId),
    orderBy: [asc(places.name)],
  });
  return rows.map(toRecord);
}

export interface CreatePlaceData {
  familyId: string;
  name: string;
  description?: string | null;
  country?: string | null;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export async function createPlace(
  data: CreatePlaceData,
): Promise<{ id: string }> {
  const [row] = await db
    .insert(places)
    .values({
      familyId: data.familyId,
      name: data.name,
      description: data.description ?? null,
      country: data.country ?? null,
      region: data.region ?? null,
      latitude: data.latitude != null ? data.latitude.toFixed(6) : null,
      longitude: data.longitude != null ? data.longitude.toFixed(6) : null,
    })
    .returning({ id: places.id });
  return row;
}

export interface UpdatePlaceData {
  name?: string;
  description?: string | null;
  country?: string | null;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export async function updatePlace(
  placeId: string,
  familyId: string,
  data: UpdatePlaceData,
): Promise<boolean> {
  const patch: Partial<typeof places.$inferInsert> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.description !== undefined) patch.description = data.description;
  if (data.country !== undefined) patch.country = data.country;
  if (data.region !== undefined) patch.region = data.region;
  if (data.latitude !== undefined) {
    patch.latitude = data.latitude != null ? data.latitude.toFixed(6) : null;
  }
  if (data.longitude !== undefined) {
    patch.longitude = data.longitude != null ? data.longitude.toFixed(6) : null;
  }

  const result = await db
    .update(places)
    .set(patch)
    .where(and(eq(places.id, placeId), eq(places.familyId, familyId)))
    .returning({ id: places.id });
  return result.length > 0;
}

export async function deletePlace(
  placeId: string,
  familyId: string,
): Promise<boolean> {
  const result = await db
    .delete(places)
    .where(and(eq(places.id, placeId), eq(places.familyId, familyId)))
    .returning({ id: places.id });
  return result.length > 0;
}
