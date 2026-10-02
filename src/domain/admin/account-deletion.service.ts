import { inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { families } from "@/db/schema";
import { vercelBlobStorageService as storage } from "@/domain/media/storage.vercel-blob";

/**
 * Deletes a user account the way /privacy (§ "Retention and deletion")
 * promises:
 *
 * - Families where nobody else is an owner are deleted with the account —
 *   all their content cascades (families.* FKs are ON DELETE CASCADE), and
 *   their stored files (`<familyId>/…` in Blob) are removed.
 * - In every family that survives, what the user added stays: the four
 *   RESTRICT authorship columns (persons.created_by, media.uploaded_by,
 *   stories.author_id, families.created_by) are handed to another owner
 *   of that family, which also unblocks the final DELETE FROM users.
 * - Deleting the user cascades accounts, memberships, drafts, share links
 *   and their activity-log entries.
 *
 * No transaction (neon-http has none): the steps are ordered so a failure
 * part-way leaves a consistent database and simply re-running finishes the
 * job — each step is idempotent.
 */
export async function deleteUserAccount(
  userId: string,
): Promise<{ deletedFamilies: number; deletedFiles: number }> {
  const doomed = await db.execute<{ id: string }>(sql`
    SELECT fm.family_id AS id
    FROM family_members fm
    WHERE fm.user_id = ${userId}
      AND NOT EXISTS (
        SELECT 1 FROM family_members other
        WHERE other.family_id = fm.family_id
          AND other.user_id <> ${userId}
          AND other.role = 'owner'
      )
  `);
  const doomedIds = doomed.rows.map((row) => row.id);

  // Surviving families always have another owner (else they'd be doomed);
  // the earliest-joined one inherits authorship.
  await db.execute(sql`
    WITH heir AS (
      SELECT DISTINCT ON (family_id) family_id, user_id
      FROM family_members
      WHERE role = 'owner' AND user_id <> ${userId}
      ORDER BY family_id, joined_at
    ),
    p AS (
      UPDATE persons SET created_by = heir.user_id FROM heir
      WHERE persons.family_id = heir.family_id
        AND persons.created_by = ${userId}
    ),
    m AS (
      UPDATE media SET uploaded_by = heir.user_id FROM heir
      WHERE media.family_id = heir.family_id
        AND media.uploaded_by = ${userId}
    ),
    s AS (
      UPDATE stories SET author_id = heir.user_id FROM heir
      WHERE stories.family_id = heir.family_id
        AND stories.author_id = ${userId}
    )
    UPDATE families SET created_by = heir.user_id FROM heir
    WHERE families.id = heir.family_id AND families.created_by = ${userId}
  `);

  if (doomedIds.length > 0) {
    await db.delete(families).where(inArray(families.id, doomedIds));
  }
  await db.execute(sql`DELETE FROM users WHERE id = ${userId}`);

  // Files last: an orphaned file is harmless (and the daily cleanup's
  // business), a row pointing at a deleted file is not.
  let deletedFiles = 0;
  for (const familyId of doomedIds) {
    for await (const file of storage.listFiles(`${familyId}/`)) {
      await storage.delete(file.storageKey);
      deletedFiles += 1;
    }
  }
  return { deletedFamilies: doomedIds.length, deletedFiles };
}
