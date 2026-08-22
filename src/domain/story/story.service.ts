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

export async function getStory(storyId: string, familyId: string): Promise<StoryRecord | null> {
  return getStoryById(storyId, familyId);
}

export async function getPersonStories(personId: string, familyId: string): Promise<StoryRecord[]> {
  return getStoriesForPerson(personId, familyId);
}

export async function listStories(familyId: string): Promise<StoryRecord[]> {
  return listStoriesByFamily(familyId);
}

export async function removeStory(storyId: string, familyId: string): Promise<boolean> {
  return deleteStory(storyId, familyId);
}
