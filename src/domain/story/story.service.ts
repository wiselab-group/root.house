import { canView, type ActingMember } from "@/domain/family/permissions";
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
  return createStory(data);
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
): Promise<boolean> {
  return deleteStory(storyId, familyId);
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
