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
}

function toRecord(row: typeof places.$inferSelect): PlaceRecord {
  return {
    id: row.id,
    familyId: row.familyId,
    name: row.name,
    description: row.description,
    country: row.country,
    region: row.region,
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
    })
    .returning({ id: places.id });
  return row;
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
