import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { families, familyMembers, persons } from "@/db/schema";
import { ForbiddenError } from "./errors";

export interface FamilySummary {
  id: string;
  name: string;
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
    columns: { id: true, name: true, description: true },
  });
  return row ?? null;
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
export async function createFamily(userId: string, input: CreateFamilyInput): Promise<{ id: string }> {
  const result = await db.execute<{ id: string }>(sql`
    WITH new_family AS (
      INSERT INTO families (name, description, created_by)
      VALUES (${input.name}, ${input.description ?? null}, ${userId})
      RETURNING id
    )
    INSERT INTO family_members (family_id, user_id, role)
    SELECT id, ${userId}, 'owner' FROM new_family
    RETURNING family_id AS id
  `);

  return { id: result.rows[0].id };
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
