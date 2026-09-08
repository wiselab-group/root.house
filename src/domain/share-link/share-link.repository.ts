import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { shareLinks } from "@/db/schema";
import type { ShareLinkVisibilityScope } from "./public-visibility";

export type ShareLinkScopeType = "FAMILY" | "PERSON" | "BRANCH" | "STORY";
export type ShareLinkPermission = "VIEW_ONLY";

export interface ShareLinkRecord {
  id: string;
  familyId: string;
  tokenHash: string;
  scopeType: ShareLinkScopeType;
  scopeId: string | null;
  focusPersonId: string;
  permission: ShareLinkPermission;
  visibilityScope: ShareLinkVisibilityScope;
  passwordHash: string | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

function toRecord(row: typeof shareLinks.$inferSelect): ShareLinkRecord {
  return { ...row };
}

export interface InsertShareLinkData {
  familyId: string;
  tokenHash: string;
  focusPersonId: string;
  visibilityScope: ShareLinkVisibilityScope;
  passwordHash: string | null;
  expiresAt: Date | null;
  createdBy: string;
}

/** MVP only ever creates scopeType="FAMILY"/permission="VIEW_ONLY" — both
 *  left at their column defaults rather than passed explicitly, so a future
 *  scope/permission value is purely additive at the call site. */
export async function insertShareLink(
  data: InsertShareLinkData,
): Promise<ShareLinkRecord> {
  const [row] = await db.insert(shareLinks).values(data).returning();
  return toRecord(row);
}

/** Scoped by familyId in the same query — same IDOR-safe convention as
 *  every other getById in this codebase. For the owner-side settings UI. */
export async function findShareLinkById(
  id: string,
  familyId: string,
): Promise<ShareLinkRecord | null> {
  const row = await db.query.shareLinks.findFirst({
    where: and(eq(shareLinks.id, id), eq(shareLinks.familyId, familyId)),
  });
  return row ? toRecord(row) : null;
}

/** NOT family-scoped — the token itself is the sole credential for the
 *  anonymous access path, mirrors findInvitationByTokenHash. */
export async function findShareLinkByTokenHash(
  tokenHash: string,
): Promise<ShareLinkRecord | null> {
  const row = await db.query.shareLinks.findFirst({
    where: eq(shareLinks.tokenHash, tokenHash),
  });
  return row ? toRecord(row) : null;
}

/** Every link for the family — active AND revoked/expired — unlike
 *  invitations' pending-only list, since the settings UI shows a status
 *  badge per row so the owner can see history, not just what's live. */
export async function listShareLinksForFamily(
  familyId: string,
): Promise<ShareLinkRecord[]> {
  const rows = await db.query.shareLinks.findMany({
    where: eq(shareLinks.familyId, familyId),
    orderBy: desc(shareLinks.createdAt),
  });
  return rows.map(toRecord);
}

export async function markRevoked(id: string, familyId: string): Promise<void> {
  await db
    .update(shareLinks)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(shareLinks.id, id), eq(shareLinks.familyId, familyId)));
}
