import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { persons } from "@/db/schema";
import { fromColumns, toColumns, type PartialDate } from "@/domain/shared/partial-date";

export interface PersonRecord {
  id: string;
  familyId: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  maidenName: string | null;
  nickname: string | null;
  gender: "male" | "female" | "unknown" | "other";
  isPlaceholder: boolean;
  isLiving: boolean;
  birthDate: PartialDate | null;
  deathDate: PartialDate | null;
  birthPlaceId: string | null;
  deathPlaceId: string | null;
  description: string | null;
  religion: string | null;
  nationality: string | null;
  photoMediaId: string | null;
  privacyLevel: "private" | "family" | "public";
  createdBy: string;
}

function toRecord(row: typeof persons.$inferSelect): PersonRecord {
  return {
    id: row.id,
    familyId: row.familyId,
    firstName: row.firstName,
    lastName: row.lastName,
    middleName: row.middleName,
    maidenName: row.maidenName,
    nickname: row.nickname,
    gender: row.gender,
    isPlaceholder: row.isPlaceholder,
    isLiving: row.isLiving,
    birthDate: fromColumns({
      year: row.birthDateYear,
      month: row.birthDateMonth,
      day: row.birthDateDay,
      precision: row.birthDatePrecision,
      approximate: row.birthDateApproximate,
    }),
    deathDate: fromColumns({
      year: row.deathDateYear,
      month: row.deathDateMonth,
      day: row.deathDateDay,
      precision: row.deathDatePrecision,
      approximate: row.deathDateApproximate,
    }),
    birthPlaceId: row.birthPlaceId,
    deathPlaceId: row.deathPlaceId,
    description: row.description,
    religion: row.religion,
    nationality: row.nationality,
    photoMediaId: row.photoMediaId,
    privacyLevel: row.privacyLevel,
    createdBy: row.createdBy,
  };
}

/**
 * Fetches a Person, scoped to a family in the SAME query as the id lookup —
 * this is the pattern every getById-style repository method must follow:
 * `WHERE id = :id AND family_id = :familyId` together, so a foreign id
 * simply returns null instead of "found, but rejected after the fact".
 */
export async function getPersonById(personId: string, familyId: string): Promise<PersonRecord | null> {
  const row = await db.query.persons.findFirst({
    where: and(eq(persons.id, personId), eq(persons.familyId, familyId)),
  });
  return row ? toRecord(row) : null;
}

export async function listPersonsByFamily(familyId: string): Promise<PersonRecord[]> {
  const rows = await db.query.persons.findMany({
    where: eq(persons.familyId, familyId),
    orderBy: [asc(persons.lastName), asc(persons.firstName)],
  });
  return rows.map(toRecord);
}

export interface CreatePersonData {
  familyId: string;
  createdBy: string;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
  maidenName?: string | null;
  nickname?: string | null;
  gender?: "male" | "female" | "unknown" | "other";
  isPlaceholder?: boolean;
  isLiving?: boolean;
  description?: string | null;
  religion?: string | null;
  nationality?: string | null;
  birthDate?: PartialDate | null;
  deathDate?: PartialDate | null;
}

export async function createPerson(data: CreatePersonData): Promise<{ id: string }> {
  const birthCols = toColumns(data.birthDate ?? null);
  const deathCols = toColumns(data.deathDate ?? null);

  const [row] = await db
    .insert(persons)
    .values({
      familyId: data.familyId,
      createdBy: data.createdBy,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      middleName: data.middleName ?? null,
      maidenName: data.maidenName ?? null,
      nickname: data.nickname ?? null,
      gender: data.gender ?? "unknown",
      isPlaceholder: data.isPlaceholder ?? false,
      isLiving: data.isLiving ?? true,
      description: data.description ?? null,
      religion: data.religion ?? null,
      nationality: data.nationality ?? null,
      birthDateYear: birthCols.year,
      birthDateMonth: birthCols.month,
      birthDateDay: birthCols.day,
      birthDatePrecision: birthCols.precision,
      birthDateApproximate: birthCols.approximate,
      deathDateYear: deathCols.year,
      deathDateMonth: deathCols.month,
      deathDateDay: deathCols.day,
      deathDatePrecision: deathCols.precision,
      deathDateApproximate: deathCols.approximate,
    })
    .returning({ id: persons.id });

  return row;
}

export type UpdatePersonData = Partial<
  Omit<CreatePersonData, "familyId" | "createdBy">
>;

/** Update is scoped by familyId in the WHERE clause, same IDOR-safe pattern as getPersonById. */
export async function updatePerson(
  personId: string,
  familyId: string,
  data: UpdatePersonData,
): Promise<boolean> {
  const patch: Partial<typeof persons.$inferInsert> = {};

  if (data.firstName !== undefined) patch.firstName = data.firstName;
  if (data.lastName !== undefined) patch.lastName = data.lastName;
  if (data.middleName !== undefined) patch.middleName = data.middleName;
  if (data.maidenName !== undefined) patch.maidenName = data.maidenName;
  if (data.nickname !== undefined) patch.nickname = data.nickname;
  if (data.gender !== undefined) patch.gender = data.gender;
  if (data.isLiving !== undefined) patch.isLiving = data.isLiving;
  if (data.description !== undefined) patch.description = data.description;
  if (data.religion !== undefined) patch.religion = data.religion;
  if (data.nationality !== undefined) patch.nationality = data.nationality;

  if (data.birthDate !== undefined) {
    const cols = toColumns(data.birthDate);
    patch.birthDateYear = cols.year;
    patch.birthDateMonth = cols.month;
    patch.birthDateDay = cols.day;
    patch.birthDatePrecision = cols.precision;
    patch.birthDateApproximate = cols.approximate;
  }
  if (data.deathDate !== undefined) {
    const cols = toColumns(data.deathDate);
    patch.deathDateYear = cols.year;
    patch.deathDateMonth = cols.month;
    patch.deathDateDay = cols.day;
    patch.deathDatePrecision = cols.precision;
    patch.deathDateApproximate = cols.approximate;
  }

  patch.updatedAt = new Date();

  const result = await db
    .update(persons)
    .set(patch)
    .where(and(eq(persons.id, personId), eq(persons.familyId, familyId)))
    .returning({ id: persons.id });

  return result.length > 0;
}

export async function deletePerson(personId: string, familyId: string): Promise<boolean> {
  const result = await db
    .delete(persons)
    .where(and(eq(persons.id, personId), eq(persons.familyId, familyId)))
    .returning({ id: persons.id });
  return result.length > 0;
}

/**
 * Assigns a Media row as a Person's profile photo, verifying the Media
 * belongs to the SAME family first (photoMediaId has no DB-level FK — see
 * db/schema/person.ts — so this check is the only thing preventing a person
 * from pointing at another family's media by id).
 */
export async function setProfilePhoto(
  personId: string,
  familyId: string,
  mediaId: string | null,
): Promise<boolean> {
  if (mediaId !== null) {
    const media = await db.query.media.findFirst({
      where: (m, { and: sqlAnd, eq: sqlEq }) => sqlAnd(sqlEq(m.id, mediaId), sqlEq(m.familyId, familyId)),
    });
    if (!media) return false;
  }

  const result = await db
    .update(persons)
    .set({ photoMediaId: mediaId, updatedAt: new Date() })
    .where(and(eq(persons.id, personId), eq(persons.familyId, familyId)))
    .returning({ id: persons.id });

  return result.length > 0;
}
