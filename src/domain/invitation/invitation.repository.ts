import { and, eq, isNull, gt, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { familyInvitations } from "@/db/schema";
import type { FamilyRole } from "@/domain/family/roles";

export interface InvitationRecord {
  id: string;
  familyId: string;
  email: string;
  role: FamilyRole;
  tokenHash: string;
  invitedBy: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

function toRecord(
  row: typeof familyInvitations.$inferSelect,
): InvitationRecord {
  return { ...row };
}

export interface InsertInvitationData {
  familyId: string;
  email: string;
  role: FamilyRole;
  tokenHash: string;
  invitedBy: string;
  expiresAt: Date;
}

export async function insertInvitation(
  data: InsertInvitationData,
): Promise<InvitationRecord> {
  const [row] = await db.insert(familyInvitations).values(data).returning();
  return toRecord(row);
}

/** Scoped by familyId in the same query — same IDOR-safe convention as every other getById. */
export async function findInvitationById(
  invitationId: string,
  familyId: string,
): Promise<InvitationRecord | null> {
  const row = await db.query.familyInvitations.findFirst({
    where: and(
      eq(familyInvitations.id, invitationId),
      eq(familyInvitations.familyId, familyId),
    ),
  });
  return row ? toRecord(row) : null;
}

/** Looked up by tokenHash alone — the accept flow has no familyId yet, the
 *  token itself is what resolves it. */
export async function findInvitationByTokenHash(
  tokenHash: string,
): Promise<InvitationRecord | null> {
  const row = await db.query.familyInvitations.findFirst({
    where: eq(familyInvitations.tokenHash, tokenHash),
  });
  return row ? toRecord(row) : null;
}

export async function listPendingInvitations(
  familyId: string,
): Promise<InvitationRecord[]> {
  const rows = await db.query.familyInvitations.findMany({
    where: and(
      eq(familyInvitations.familyId, familyId),
      isNull(familyInvitations.acceptedAt),
      isNull(familyInvitations.revokedAt),
      gt(familyInvitations.expiresAt, new Date()),
    ),
    orderBy: desc(familyInvitations.createdAt),
  });
  return rows.map(toRecord);
}

export async function markRevoked(
  invitationId: string,
  familyId: string,
): Promise<void> {
  await db
    .update(familyInvitations)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(familyInvitations.id, invitationId),
        eq(familyInvitations.familyId, familyId),
      ),
    );
}

export async function markAccepted(invitationId: string): Promise<void> {
  await db
    .update(familyInvitations)
    .set({ acceptedAt: new Date() })
    .where(eq(familyInvitations.id, invitationId));
}
