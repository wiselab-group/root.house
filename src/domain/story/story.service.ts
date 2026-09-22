import { canView, type ActingMember } from "@/domain/family/permissions";
import { logActivity } from "@/domain/activity-log/activity-log.service";
import { ensureUniqueSlug, slugifyStory } from "./slug";
import {
  createStory,
  deleteStory,
  getPersonIdsForStories,
  getPersonIdsForStory,
  getStoriesForPerson,
  getStoryById,
  getStoryBySlug,
  isStorySlugTaken,
  listStoriesByFamily,
  replaceStoryPeople,
  updateStory,
  type CreateStoryData,
  type StoryRecord,
  type UpdateStoryData,
} from "./story.repository";

export type { StoryRecord };

function randomSeed(): string {
  return crypto.randomUUID();
}

async function generateUniqueStorySlug(
  familyId: string,
  title: string,
): Promise<string> {
  const base = slugifyStory(title, randomSeed());
  return ensureUniqueSlug(base, (candidate) =>
    isStorySlugTaken(candidate, familyId),
  );
}

export async function addStory(
  data: Omit<CreateStoryData, "slug">,
): Promise<{ id: string; slug: string }> {
  const slug = await generateUniqueStorySlug(data.familyId, data.title);
  const result = await createStory({ ...data, slug });

  await logActivity({
    familyId: data.familyId,
    actorId: data.authorId,
    action: "create",
    entityType: "story",
    entityId: result.id,
    entityLabel: data.title,
  });

  return { ...result, slug };
}

export async function getStory(
  storyId: string,
  familyId: string,
): Promise<StoryRecord | null> {
  return getStoryById(storyId, familyId);
}

/**
 * Resolves the /families/[familySlug]/stories/[slug] URL segment to a
 * storyId — same contract as person.service.ts::getPersonIdBySlug: null
 * for an unknown slug so callers can 404 without leaking whether it ever
 * existed.
 */
export async function getStoryIdBySlug(
  slug: string,
  familyId: string,
): Promise<string | null> {
  const story = await getStoryBySlug(slug, familyId);
  return story?.id ?? null;
}

export async function getPersonStories(
  personId: string,
  familyId: string,
): Promise<StoryRecord[]> {
  return getStoriesForPerson(personId, familyId);
}

export async function listStories(familyId: string): Promise<StoryRecord[]> {
  return listStoriesByFamily(familyId);
}

/** Person ids currently linked to a Story — powers the "Люди" section on
 *  the story detail page. */
export async function getStoryPersonIds(storyId: string): Promise<string[]> {
  return getPersonIdsForStory(storyId);
}

/** Batch version of getStoryPersonIds for a whole page of stories at once
 *  — see story.repository.ts::getPersonIdsForStories. */
export async function getStoryPersonIdsBatch(
  storyIds: string[],
): Promise<Map<string, string[]>> {
  return getPersonIdsForStories(storyIds);
}

export interface EditStoryInput extends UpdateStoryData {
  /** Undefined leaves linked people unchanged; an array (including empty)
   *  replaces the full set — same convention as event.service.ts::editEvent. */
  personIds?: string[];
}

export async function editStory(
  storyId: string,
  familyId: string,
  actorId: string,
  data: EditStoryInput,
): Promise<boolean> {
  const { personIds, ...patch } = data;
  const updated = await updateStory(storyId, familyId, patch);
  if (!updated) return false;

  if (personIds !== undefined) {
    await replaceStoryPeople(storyId, personIds);
  }

  const story = await getStoryById(storyId, familyId);
  if (story) {
    await logActivity({
      familyId,
      actorId,
      action: "update",
      entityType: "story",
      entityId: storyId,
      entityLabel: story.title,
    });
  }

  return true;
}

export async function removeStory(
  storyId: string,
  familyId: string,
  actorId: string,
): Promise<boolean> {
  const story = await getStoryById(storyId, familyId);
  const deleted = await deleteStory(storyId, familyId);

  if (deleted && story) {
    await logActivity({
      familyId,
      actorId,
      action: "delete",
      entityType: "story",
      entityId: storyId,
      entityLabel: story.title,
    });
  }

  return deleted;
}

/** Filters a list of Stories down to what `member` may see per the PRIVATE
 *  visibility rule — see event.service.ts::filterVisibleEvents for the
 *  identical shape/rationale. */
export function filterVisibleStories(
  stories: StoryRecord[],
  member: ActingMember,
): StoryRecord[] {
  return stories.filter((s) =>
    canView(member, { privacyLevel: s.privacyLevel, createdBy: s.authorId }),
  );
}

/** Same IDOR-safe-preserving contract as getVisiblePerson: returns null both
 *  when the Story doesn't exist in this family AND when it exists but
 *  `member` isn't entitled to see it. */
export async function getVisibleStory(
  storyId: string,
  familyId: string,
  member: ActingMember,
): Promise<StoryRecord | null> {
  const story = await getStory(storyId, familyId);
  if (!story) return null;
  return canView(member, {
    privacyLevel: story.privacyLevel,
    createdBy: story.authorId,
  })
    ? story
    : null;
}
