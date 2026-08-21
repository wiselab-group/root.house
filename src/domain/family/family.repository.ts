import { and, eq } from "drizzle-orm";
import { db as defaultDb } from "@/db/client";
import { familyMembers, families } from "@/db/schema";
import type { FamilyRole } from "./roles";

export interface FamilyMemberRow {
  id: string;
  familyId: string;
  userId: string;
  role: FamilyRole;
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
    where: and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, userId)),
  });
  return member ?? null;
}

export async function familyExists(
  familyId: string,
  database: FamilyDb = defaultDb as unknown as FamilyDb,
): Promise<boolean> {
  const row = await database.query.families?.findFirst({ where: eq(families.id, familyId) });
  return row != null;
}
