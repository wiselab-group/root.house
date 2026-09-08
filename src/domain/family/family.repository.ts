import { and, eq } from "drizzle-orm";
import { db as defaultDb } from "@/db/client";
import { familyMembers, families } from "@/db/schema";
import type { FamilyRole } from "./roles";
import { isLastOwnerDemotion } from "./member-guard";

export interface FamilyMemberRow {
  id: string;
  familyId: string;
  userId: string;
  role: FamilyRole;
  defaultFocusPersonId?: string | null;
}

/** Minimal shape of `db` this repository needs — lets tests inject a fake instead of a live connection. */
export interface FamilyDb {
  query: {
    familyMembers: {
      findFirst: (args: unknown) => Promise<FamilyMemberRow | undefined>;
    };
    families?: {
      findFirst: (args: unknown) => Promise<{ id: string } | undefined>;
    };
  };
}

export async function findMembership(
  familyId: string,
  userId: string,
  database: FamilyDb = defaultDb as unknown as FamilyDb,
): Promise<FamilyMemberRow | null> {
  const member = await database.query.familyMembers.findFirst({
    where: and(
      eq(familyMembers.familyId, familyId),
      eq(familyMembers.userId, userId),
    ),
  });
  return member ?? null;
}

export async function familyExists(
  familyId: string,
  database: FamilyDb = defaultDb as unknown as FamilyDb,
): Promise<boolean> {
  const row = await database.query.families?.findFirst({
    where: eq(families.id, familyId),
  });
  return row != null;
}

/**
 * Changes a member's role, refusing to demote the last remaining owner —
 * same guard as removeFamilyMember (see member-guard.ts::isLastOwnerDemotion).
 * Caller must have already verified (via requireFamilyAccess with 'owner')
 * that the actor may manage roles.
 */
export async function updateMemberRole(
  familyId: string,
  memberUserId: string,
  newRole: FamilyRole,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const members = await defaultDb.query.familyMembers.findMany({
    where: eq(familyMembers.familyId, familyId),
  });

  const target = members.find((m) => m.userId === memberUserId);
  if (!target) return { ok: false, error: "Участник не найден." };

  if (isLastOwnerDemotion(members, memberUserId, newRole)) {
    return { ok: false, error: "В семье должен быть хотя бы один владелец." };
  }

  await defaultDb
    .update(familyMembers)
    .set({ role: newRole })
    .where(
      and(
        eq(familyMembers.familyId, familyId),
        eq(familyMembers.userId, memberUserId),
      ),
    );
  return { ok: true };
}

/**
 * Sets (or clears, with personId=null) the caller's own default focus
 * person for this family — a per-user viewing preference stored on their
 * FamilyMember row, not a family-wide setting. Caller must have already
 * verified membership (requireFamilyAccess) and that personId (if given)
 * belongs to this same family — this function does not re-check either.
 */
export async function setDefaultFocusPerson(
  familyId: string,
  userId: string,
  personId: string | null,
): Promise<void> {
  await defaultDb
    .update(familyMembers)
    .set({ defaultFocusPersonId: personId })
    .where(
      and(
        eq(familyMembers.familyId, familyId),
        eq(familyMembers.userId, userId),
      ),
    );
}
