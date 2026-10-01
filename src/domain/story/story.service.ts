import {
  canEdit,
  canView,
  type ActingMember,
} from "@/domain/family/permissions";
import { logActivity } from "@/domain/activity-log/activity-log.service";
import { ensureUniqueSlug, slugifyStory } from "./slug";
import { getNarrationByStory } from "./story-narration.repository";
import { deleteMediaRow } from "@/domain/media/media.repository";
import { vercelBlobStorageService as storage } from "@/domain/media/storage.vercel-blob";
import {
  createStory,
  deleteStory,
  findEmptyDraft,
  listDraftsByAuthor,
  getPersonIdsForStories,
  getPersonIdsForStory,
  getStoriesForPerson,
  getStoryById,
  getStoryBySlug,
  isStorySlugTaken,
  listStoriesByFamily,
  replaceStoryPeople,
  updateStory,
  type StoryRecord,
  type UpdateStoryData,
} from "./story.repository";

import {
  deleteStoryDraft,
  getStoryDraft,
  upsertStoryDraft,
  type StoryDraftRecord,
} from "./story-draft.repository";

export type { StoryRecord, StoryDraftRecord };

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
  // Saved for real — the actor's autosaved edits are now the story itself.
  await deleteStoryDraft(storyId, actorId, familyId);

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
  // Its recording goes with it: the story_narration row cascades, but the
  // audio's own media row and file would be left behind otherwise.
  const narration = await getNarrationByStory(storyId, familyId);
  const deleted = await deleteStory(storyId, familyId);
  if (deleted && narration) {
    await deleteMediaRow(narration.mediaId, familyId);
    await storage.delete(narration.storageKey).catch(() => {});
  }

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

/** Filters a list of Stories down to what `member` may see in the family
 *  archive: published only (drafts never appear in lists, profiles or
 *  counts — not even the author's own; those live in «Мои черновики», see
 *  listMyDrafts), then the PRIVATE visibility rule — see
 *  event.service.ts::filterVisibleEvents for the identical shape. */
export function filterVisibleStories(
  stories: StoryRecord[],
  member: ActingMember,
): StoryRecord[] {
  return stories.filter(
    (s) =>
      s.status === "published" &&
      canView(member, { privacyLevel: s.privacyLevel, createdBy: s.authorId }),
  );
}

/** Whether `member` may open this single story at all: a draft only by its
 *  author — not even the family owner, whose PRIVATE override is about
 *  finished records, not someone's unfinished writing. */
function canViewStory(member: ActingMember, story: StoryRecord): boolean {
  if (story.status === "draft") return story.authorId === member.userId;
  return canView(member, {
    privacyLevel: story.privacyLevel,
    createdBy: story.authorId,
  });
}

/** Whether `member` may edit this story — same draft rule as canViewStory,
 *  then the usual canEdit (author or owner/editor on non-private). */
export function canEditStory(
  member: ActingMember,
  story: StoryRecord,
): boolean {
  if (story.status === "draft") return story.authorId === member.userId;
  return canEdit(member, {
    privacyLevel: story.privacyLevel,
    createdBy: story.authorId,
  });
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
  return canViewStory(member, story) ? story : null;
}

/** The author's own drafts in this family — «Мои черновики». */
export async function listMyDrafts(
  familyId: string,
  authorId: string,
): Promise<StoryRecord[]> {
  return listDraftsByAuthor(familyId, authorId);
}

/**
 * «Новая история»: a draft row the editor can autosave into from the first
 * keystroke. An untouched draft of the same author is reused (its people
 * replaced) rather than piling up empty drafts. Not activity-logged — the
 * family hears about a story when it's published (publishStory).
 */
export async function createDraftStory(
  familyId: string,
  authorId: string,
  personIds: string[],
): Promise<{ id: string; slug: string }> {
  const empty = await findEmptyDraft(familyId, authorId);
  if (empty) {
    await replaceStoryPeople(empty.id, personIds);
    return { id: empty.id, slug: empty.slug };
  }
  const slug = await generateUniqueStorySlug(familyId, "");
  const { id } = await createStory({
    familyId,
    authorId,
    slug,
    title: "",
    body: "",
    status: "draft",
    personIds,
  });
  return { id, slug };
}

/**
 * Autosave. A draft story's own row IS the draft (only its author sees
 * it), so it's written directly; a published story's text stays what the
 * family reads, and the edits go to this user's story_drafts row until
 * «Сохранить». Never activity-logged — it fires every few seconds.
 */
export async function saveStoryDraftContent(
  story: StoryRecord,
  userId: string,
  content: { title: string; body: string },
): Promise<void> {
  if (story.status === "draft") {
    await updateStory(story.id, story.familyId, content);
    return;
  }
  await upsertStoryDraft({
    familyId: story.familyId,
    storyId: story.id,
    userId,
    ...content,
  });
}

/** This user's autosaved edits to a published story, if any. */
export async function getMyStoryDraft(
  storyId: string,
  userId: string,
  familyId: string,
): Promise<StoryDraftRecord | null> {
  return getStoryDraft(storyId, userId, familyId);
}

export async function discardMyStoryDraft(
  storyId: string,
  userId: string,
  familyId: string,
): Promise<void> {
  await deleteStoryDraft(storyId, userId, familyId);
}

/**
 * Draft → published: saves the final fields, flips the status and gives
 * the story a real slug from its title (the draft's was a placeholder like
 * «story-1a2b3c4d» — nobody but the author ever saw that URL). Stamps
 * publishedAt and is logged as the story's creation, since that's when the
 * family first sees it.
 */
export async function publishStory(
  story: StoryRecord,
  actorId: string,
  data: EditStoryInput & { title: string },
): Promise<{ slug: string }> {
  const { personIds, ...patch } = data;
  const slug = await generateUniqueStorySlug(story.familyId, data.title);
  await updateStory(story.id, story.familyId, {
    ...patch,
    status: "published",
    slug,
    publishedAt: new Date(),
  });
  if (personIds !== undefined) {
    await replaceStoryPeople(story.id, personIds);
  }
  await logActivity({
    familyId: story.familyId,
    actorId,
    action: "create",
    entityType: "story",
    entityId: story.id,
    entityLabel: data.title,
  });
  return { slug };
}
