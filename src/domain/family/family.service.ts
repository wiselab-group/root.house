import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { families, familyMembers, persons } from "@/db/schema";
import { getPerson } from "@/domain/person/person.service";
import { ForbiddenError, SlugTakenError } from "./errors";
import { setDefaultFocusPerson } from "./family.repository";
import { ensureUniqueSlug, isValidSlugFormat, slugify } from "./slug";

export interface FamilySummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface FamilySummaryWithCount extends FamilySummary {
  personCount: number;
}

/** Families the given user belongs to, regardless of role, newest first —
 *  each annotated with how many Person records the family already holds
 *  (a correlated subquery, so families with zero people still come back
 *  as 0 rather than being dropped by a join). */
export async function listFamiliesForUser(userId: string): Promise<FamilySummaryWithCount[]> {
  const personCount = sql<number>`(
    select count(*)::int from ${persons} where ${persons.familyId} = ${families.id}
  )`.as("person_count");

  const rows = await db
    .select({
      id: families.id,
      name: families.name,
      slug: families.slug,
      description: families.description,
      personCount,
    })
    .from(familyMembers)
    .innerJoin(families, eq(familyMembers.familyId, families.id))
    .where(eq(familyMembers.userId, userId))
    .orderBy(families.createdAt);

  return rows;
}

/** Fetches a family's own summary fields — NOT scoped by user, callers must
 *  already hold a validated FamilyMember row (e.g. via requireFamilyAccess)
 *  before calling this to render family name/description. */
export async function getFamilySummary(familyId: string): Promise<FamilySummary | null> {
  const row = await db.query.families.findFirst({
    where: eq(families.id, familyId),
    columns: { id: true, name: true, slug: true, description: true },
  });
  return row ?? null;
}

/**
 * Resolves a public slug (the /families/[slug] URL segment) to a familyId —
 * this is NOT an access check: every caller still must go through
 * requireFamilyAccess with the resolved id before reading/writing anything.
 * Returns null for an unknown slug rather than throwing, so callers can
 * 404 without leaking whether the slug ever existed. See
 * lib/resolve-family-slug.ts for the cached Server Component wrapper used
 * by layouts/pages.
 */
export async function getFamilyIdBySlug(slug: string): Promise<string | null> {
  const row = await db.query.families.findFirst({
    where: eq(families.slug, slug),
    columns: { id: true },
  });
  return row?.id ?? null;
}

/**
 * The inverse of getFamilyIdBySlug — used by Server Actions that already
 * hold a validated familyId (from requireFamilyAccess) and need to build a
 * /families/[slug]/... redirect or revalidatePath target after a mutation.
 * Not an access check either; callers must already have authorized familyId.
 */
export async function getFamilySlugById(familyId: string): Promise<string | null> {
  const row = await db.query.families.findFirst({
    where: eq(families.id, familyId),
    columns: { slug: true },
  });
  return row?.slug ?? null;
}

export interface CreateFamilyInput {
  name: string;
  description?: string;
}

/**
 * Creates a Family and makes the creator its 'owner' via FamilyMember,
 * atomically. A Family must never exist without at least one owner.
 *
 * This is a single CTE-based INSERT rather than db.transaction(...) because
 * the neon-http driver (chosen for its serverless/edge-friendly HTTP
 * transport — see docs/architecture.md) does not support multi-statement
 * transactions at all ("No transactions support in neon-http driver").
 * A single SQL statement is atomic in Postgres on its own, so this achieves
 * the same guarantee without needing transaction support from the driver.
 */
export async function createFamily(
  userId: string,
  input: CreateFamilyInput,
): Promise<{ id: string; slug: string }> {
  const slug = await ensureUniqueSlug(slugify(input.name), async (candidate) => {
    const existing = await db.query.families.findFirst({
      where: eq(families.slug, candidate),
      columns: { id: true },
    });
    return existing !== undefined;
  });

  const result = await db.execute<{ id: string }>(sql`
    WITH new_family AS (
      INSERT INTO families (name, slug, description, created_by)
      VALUES (${input.name}, ${slug}, ${input.description ?? null}, ${userId})
      RETURNING id
    )
    INSERT INTO family_members (family_id, user_id, role)
    SELECT id, ${userId}, 'owner' FROM new_family
    RETURNING family_id AS id
  `);

  return { id: result.rows[0].id, slug };
}

/**
 * Changes a family's slug — caller must have already verified (via
 * requireFamilyAccess with 'owner') that the actor may rename the family's
 * public handle. Rejects malformed/reserved slugs and slugs already taken by
 * a *different* family; renaming to the family's own current slug is a no-op
 * success, not a conflict.
 */
export async function updateFamilySlug(familyId: string, newSlug: string): Promise<void> {
  if (!isValidSlugFormat(newSlug)) {
    throw new SlugTakenError(
      "Ссылка может содержать только латинские буквы, цифры и дефис (2-64 символа).",
    );
  }

  const existing = await db.query.families.findFirst({
    where: eq(families.slug, newSlug),
    columns: { id: true },
  });

  if (existing && existing.id !== familyId) {
    throw new SlugTakenError("Эта ссылка уже занята другой семьёй.");
  }

  await db
    .update(families)
    .set({ slug: newSlug, updatedAt: new Date() })
    .where(and(eq(families.id, familyId), ne(families.slug, newSlug)));
}

export interface UpdateFamilyDetailsInput {
  name: string;
  description?: string;
}

/**
 * Updates a family's display name/description — caller must have already
 * verified (via requireFamilyAccess) that the actor may edit the family.
 * Unlike the slug, these are cosmetic fields that don't back any URL or
 * external link, so any editor (not just the owner) may change them.
 */
export async function updateFamilyDetails(
  familyId: string,
  input: UpdateFamilyDetailsInput,
): Promise<void> {
  await db
    .update(families)
    .set({ name: input.name, description: input.description ?? null, updatedAt: new Date() })
    .where(eq(families.id, familyId));
}

/**
 * Sets the caller's own default focus person for this family — the person
 * the family tree centers on by default, next time THIS user opens it (a
 * per-user preference, stored on their own FamilyMember row, not a
 * family-wide setting). Pass personId=null to clear it back to "no
 * preference" (tree/page.tsx then falls back to the first person in the
 * family). Caller must have already verified familyId/userId via
 * requireFamilyAccess before calling this.
 *
 * personId, if given, must belong to this same family — getPerson's
 * `WHERE id = ... AND family_id = ...` check is what makes this an IDOR-safe
 * validation rather than trusting a client-supplied id at face value.
 */
export async function updateDefaultFocusPerson(
  familyId: string,
  userId: string,
  personId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (personId !== null) {
    const person = await getPerson(personId, familyId);
    if (!person) {
      return { ok: false, error: "Этот человек не найден в этой семье." };
    }
  }

  await setDefaultFocusPerson(familyId, userId, personId);
  return { ok: true };
}

/**
 * Removes a FamilyMember, refusing to remove the last remaining owner — a
 * Family without an owner would have no one able to manage membership/roles.
 * Caller must have already verified (via requireFamilyAccess) that the actor
 * is allowed to manage membership.
 */
export async function removeFamilyMember(familyId: string, memberUserId: string): Promise<void> {
  const members = await db.query.familyMembers.findMany({
    where: eq(familyMembers.familyId, familyId),
  });

  const target = members.find((m) => m.userId === memberUserId);
  if (!target) return; // already not a member — nothing to do

  const remainingOwners = members.filter((m) => m.role === "owner" && m.userId !== memberUserId);

  if (target.role === "owner" && remainingOwners.length === 0) {
    throw new ForbiddenError("A family must always have at least one owner.");
  }

  await db
    .delete(familyMembers)
    .where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, memberUserId)));
}
