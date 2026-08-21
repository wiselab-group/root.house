import { and, eq } from "drizzle-orm";
import { familyMembers, families } from "@/db/schema";
import type { FamilyRole } from "./roles";

export interface FamilyMemberRow {
  id: string;
  familyId: string;
  userId: string;
  role: FamilyRole;
}

/** Minimal shape of `db` this repository needs — lets tests inject a fake. */
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

/**
 * Lazily imports the real database client. Kept as a dynamic import (rather
 * than a top-level `import { db } from "@/db/client"`) so this module — and
 * anything that calls findMembership/requireFamilyAccess with an injected
 * fake `database` — never triggers `@/db/client`'s DATABASE_URL check at
 * module-load time. That check should only ever run when code actually needs
 * a live connection, e.g. in real server actions, never in unit tests.
 */
async function getDefaultDb(): Promise<FamilyDb> {
  const { db } = await import("@/db/client");
  return db as unknown as FamilyDb;
}

export async function findMembership(
  familyId: string,
  userId: string,
  database?: FamilyDb,
): Promise<FamilyMemberRow | null> {
  const resolvedDb = database ?? (await getDefaultDb());
  const member = await resolvedDb.query.familyMembers.findFirst({
    where: and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, userId)),
  });
  return member ?? null;
}

export async function familyExists(familyId: string, database?: FamilyDb): Promise<boolean> {
  const resolvedDb = database ?? (await getDefaultDb());
  const row = await resolvedDb.query.families?.findFirst({ where: eq(families.id, familyId) });
  return row != null;
}
