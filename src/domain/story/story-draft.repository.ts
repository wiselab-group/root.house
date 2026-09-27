import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { storyDrafts } from "@/db/schema";

/** A user's unsaved edits to a published story — see the storyDrafts table. */
export interface StoryDraftRecord {
  title: string;
  body: string;
  updatedAt: Date;
}

/** Scoped by family in the same query, like every other by-id read. */
export async function getStoryDraft(
  storyId: string,
  userId: string,
  familyId: string,
): Promise<StoryDraftRecord | null> {
  const row = await db.query.storyDrafts.findFirst({
    where: and(
      eq(storyDrafts.storyId, storyId),
      eq(storyDrafts.userId, userId),
      eq(storyDrafts.familyId, familyId),
    ),
  });
  return row
    ? { title: row.title, body: row.body, updatedAt: row.updatedAt }
    : null;
}

/** Insert-or-update in ONE statement (ON CONFLICT on story+user) — the
 *  neon-http driver has no transactions, and autosave fires every few
 *  seconds, so a read-then-write pair could race itself. */
export async function upsertStoryDraft(data: {
  familyId: string;
  storyId: string;
  userId: string;
  title: string;
  body: string;
}): Promise<Date> {
  const now = new Date();
  await db
    .insert(storyDrafts)
    .values({ ...data, updatedAt: now })
    .onConflictDoUpdate({
      target: [storyDrafts.storyId, storyDrafts.userId],
      set: { title: data.title, body: data.body, updatedAt: now },
    });
  return now;
}

export async function deleteStoryDraft(
  storyId: string,
  userId: string,
  familyId: string,
): Promise<void> {
  await db
    .delete(storyDrafts)
    .where(
      and(
        eq(storyDrafts.storyId, storyId),
        eq(storyDrafts.userId, userId),
        eq(storyDrafts.familyId, familyId),
      ),
    );
}
