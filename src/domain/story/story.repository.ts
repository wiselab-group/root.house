import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { stories, storyPerson } from "@/db/schema";

export interface StoryRecord {
  id: string;
  familyId: string;
  title: string;
  body: string;
  privacyLevel: "private" | "family" | "public";
  authorId: string;
}

function toRecord(row: typeof stories.$inferSelect): StoryRecord {
  return {
    id: row.id,
    familyId: row.familyId,
    title: row.title,
    body: row.body,
    privacyLevel: row.privacyLevel,
    authorId: row.authorId,
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

/** All stories linked to a given Person, newest first. */
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
    .orderBy(desc(stories.createdAt));

  return rows.map((r) => toRecord(r.story));
}

export async function listStoriesByFamily(
  familyId: string,
): Promise<StoryRecord[]> {
  const rows = await db.query.stories.findMany({
    where: eq(stories.familyId, familyId),
    orderBy: [desc(stories.createdAt)],
  });
  return rows.map(toRecord);
}

export interface CreateStoryData {
  familyId: string;
  title: string;
  body: string;
  authorId: string;
  /** Person ids to link this Story to, created atomically with the row. */
  personIds: string[];
}

export async function createStory(
  data: CreateStoryData,
): Promise<{ id: string }> {
  const [row] = await db
    .insert(stories)
    .values({
      familyId: data.familyId,
      title: data.title,
      body: data.body,
      authorId: data.authorId,
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
