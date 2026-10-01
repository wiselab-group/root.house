import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { stories, storyPerson, type PrivacyLevel } from "@/db/schema";

export type StoryStatus = (typeof stories.$inferSelect)["status"];

export interface StoryRecord {
  id: string;
  familyId: string;
  slug: string;
  title: string;
  body: string;
  privacyLevel: PrivacyLevel;
  authorId: string;
  /** `draft` — visible only to its author (see story.service.ts's
   *  visibility helpers); `published` — the family archive. */
  status: StoryStatus;
  createdAt: Date;
  updatedAt: Date;
  /** When it went from draft to published — null while a draft. */
  publishedAt: Date | null;
}

/** Newest-published first; a draft (no publishedAt) sorts by when it was
 *  started. Lists only ever show published stories, but they're filtered
 *  after the query (story.service.ts::filterVisibleStories). */
const byPublishedDesc = desc(
  sql`coalesce(${stories.publishedAt}, ${stories.createdAt})`,
);

function toRecord(row: typeof stories.$inferSelect): StoryRecord {
  return {
    id: row.id,
    familyId: row.familyId,
    slug: row.slug,
    title: row.title,
    body: row.body,
    privacyLevel: row.privacyLevel,
    authorId: row.authorId,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
  };
}

/** Fetches a Story scoped to a family in the same query — same IDOR-safe pattern as getPersonById. */
export async function getStoryById(
  storyId: string,
  familyId: string,
): Promise<StoryRecord | null> {
  const row = await db.query.stories.findFirst({
    where: and(eq(stories.id, storyId), eq(stories.familyId, familyId)),
  });
  return row ? toRecord(row) : null;
}

/**
 * Resolves the /families/[familySlug]/stories/[slug] URL segment to a
 * Story — same pattern as person.repository.ts::getPersonBySlug.
 */
export async function getStoryBySlug(
  slug: string,
  familyId: string,
): Promise<StoryRecord | null> {
  const row = await db.query.stories.findFirst({
    where: and(eq(stories.slug, slug), eq(stories.familyId, familyId)),
  });
  return row ? toRecord(row) : null;
}

/** Whether `slug` is already used by another Story in the same family —
 *  used by ensureUniqueSlug during creation. */
export async function isStorySlugTaken(
  slug: string,
  familyId: string,
): Promise<boolean> {
  const row = await db.query.stories.findFirst({
    where: and(eq(stories.slug, slug), eq(stories.familyId, familyId)),
    columns: { id: true },
  });
  return row !== undefined;
}

/** All stories linked to a given Person, newest-published first. */
export async function getStoriesForPerson(
  personId: string,
  familyId: string,
): Promise<StoryRecord[]> {
  const rows = await db
    .select({ story: stories })
    .from(storyPerson)
    .innerJoin(stories, eq(storyPerson.storyId, stories.id))
    .where(
      and(eq(storyPerson.personId, personId), eq(stories.familyId, familyId)),
    )
    .orderBy(byPublishedDesc);

  return rows.map((r) => toRecord(r.story));
}

export async function listStoriesByFamily(
  familyId: string,
): Promise<StoryRecord[]> {
  const rows = await db.query.stories.findMany({
    where: eq(stories.familyId, familyId),
    orderBy: [byPublishedDesc],
  });
  return rows.map(toRecord);
}

/** One author's own drafts in a family, most recently edited first — the
 *  «Мои черновики» block on /stories. */
export async function listDraftsByAuthor(
  familyId: string,
  authorId: string,
): Promise<StoryRecord[]> {
  const rows = await db.query.stories.findMany({
    where: and(
      eq(stories.familyId, familyId),
      eq(stories.status, "draft"),
      eq(stories.authorId, authorId),
    ),
    orderBy: [desc(stories.updatedAt)],
  });
  return rows.map(toRecord);
}

/** An author's untouched draft (no title, no text) in this family, if any —
 *  «Новая история» reuses it instead of piling up empty drafts every time
 *  the editor is opened and left without typing. */
export async function findEmptyDraft(
  familyId: string,
  authorId: string,
): Promise<StoryRecord | null> {
  const row = await db.query.stories.findFirst({
    where: and(
      eq(stories.familyId, familyId),
      eq(stories.status, "draft"),
      eq(stories.authorId, authorId),
      eq(stories.title, ""),
      eq(stories.body, ""),
    ),
  });
  return row ? toRecord(row) : null;
}

export interface CreateStoryData {
  familyId: string;
  slug: string;
  title: string;
  body: string;
  authorId: string;
  privacyLevel?: PrivacyLevel;
  status?: StoryStatus;
  /** Person ids to link this Story to, created atomically with the row. */
  personIds: string[];
}

export async function createStory(
  data: CreateStoryData,
): Promise<{ id: string }> {
  const status = data.status ?? "published";
  const [row] = await db
    .insert(stories)
    .values({
      familyId: data.familyId,
      slug: data.slug,
      title: data.title,
      body: data.body,
      authorId: data.authorId,
      privacyLevel: data.privacyLevel ?? "family",
      status,
      publishedAt: status === "published" ? new Date() : null,
    })
    .returning({ id: stories.id });

  if (data.personIds.length > 0) {
    await db
      .insert(storyPerson)
      .values(
        data.personIds.map((personId) => ({ storyId: row.id, personId })),
      );
  }

  return row;
}

export interface UpdateStoryData {
  title?: string;
  body?: string;
  privacyLevel?: PrivacyLevel;
  /** Only ever `draft` → `published` (story.service.ts::publishStory). */
  status?: StoryStatus;
  /** Re-derived from the title on first publish — see publishStory. */
  slug?: string;
  /** Set together with status `published` — see publishStory. */
  publishedAt?: Date;
}

export async function updateStory(
  storyId: string,
  familyId: string,
  data: UpdateStoryData,
): Promise<boolean> {
  const patch: Partial<typeof stories.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (data.title !== undefined) patch.title = data.title;
  if (data.body !== undefined) patch.body = data.body;
  if (data.privacyLevel !== undefined) patch.privacyLevel = data.privacyLevel;
  if (data.status !== undefined) patch.status = data.status;
  if (data.slug !== undefined) patch.slug = data.slug;
  if (data.publishedAt !== undefined) patch.publishedAt = data.publishedAt;

  const result = await db
    .update(stories)
    .set(patch)
    .where(and(eq(stories.id, storyId), eq(stories.familyId, familyId)))
    .returning({ id: stories.id });
  return result.length > 0;
}

/** Replaces a Story's full linked-people list — delete-then-reinsert
 *  rather than diffing, same reasoning as
 *  event.repository.ts::replaceParticipants. Doesn't re-check familyId in
 *  its own WHERE (the join table has no familyId column) — caller must
 *  have already verified the story belongs to `familyId` (story.service.ts::
 *  editStory does this via updateStory's own scoped WHERE succeeding first). */
export async function replaceStoryPeople(
  storyId: string,
  personIds: string[],
): Promise<void> {
  await db.delete(storyPerson).where(eq(storyPerson.storyId, storyId));

  if (personIds.length > 0) {
    await db
      .insert(storyPerson)
      .values(personIds.map((personId) => ({ storyId, personId })));
  }
}

export async function deleteStory(
  storyId: string,
  familyId: string,
): Promise<boolean> {
  const result = await db
    .delete(stories)
    .where(and(eq(stories.id, storyId), eq(stories.familyId, familyId)))
    .returning({ id: stories.id });
  return result.length > 0;
}

/** Person ids currently linked to a Story — used to render "Люди" on the
 *  story detail page and to prefill the edit form's person picker. */
export async function getPersonIdsForStory(storyId: string): Promise<string[]> {
  const rows = await db
    .select({ personId: storyPerson.personId })
    .from(storyPerson)
    .where(eq(storyPerson.storyId, storyId));
  return rows.map((r) => r.personId);
}

/** Batch version of getPersonIdsForStory for a whole page of stories at
 *  once (the /stories list) — avoids an N+1 query per story row, same
 *  reasoning as media.repository.ts::getPeopleForMedia. */
export async function getPersonIdsForStories(
  storyIds: string[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (storyIds.length === 0) return result;

  const rows = await db
    .select({ storyId: storyPerson.storyId, personId: storyPerson.personId })
    .from(storyPerson)
    .where(inArray(storyPerson.storyId, storyIds));

  for (const row of rows) {
    const existing = result.get(row.storyId) ?? [];
    existing.push(row.personId);
    result.set(row.storyId, existing);
  }

  return result;
}
