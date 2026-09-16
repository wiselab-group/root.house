import { canView, type ActingMember } from "@/domain/family/permissions";
import { logActivity } from "@/domain/activity-log/activity-log.service";
import {
  createStory,
  deleteStory,
  getStoriesForPerson,
  getStoryById,
  listStoriesByFamily,
  type CreateStoryData,
  type StoryRecord,
} from "./story.repository";

export type { StoryRecord };

export async function addStory(data: CreateStoryData): Promise<{ id: string }> {
  const result = await createStory(data);

  await logActivity({
    familyId: data.familyId,
    actorId: data.authorId,
    action: "create",
    entityType: "story",
    entityId: result.id,
    entityLabel: data.title,
  });

  return result;
}

export async function getStory(
  storyId: string,
  familyId: string,
): Promise<StoryRecord | null> {
  return getStoryById(storyId, familyId);
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
