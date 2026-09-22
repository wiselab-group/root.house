"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { ForbiddenError } from "@/domain/family/errors";
import { canCreate, canDelete, canEdit } from "@/domain/family/permissions";
import { getFamilySlugById } from "@/domain/family/family.service";
import { getPersonSlugById } from "@/domain/person/person.service";
import { createStorySchema } from "@/lib/validation/story";
import {
  addStory,
  editStory,
  getStory,
  removeStory,
} from "@/domain/story/story.service";

export interface StoryFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * "Add a story from a Person's profile" — a story linked to exactly that
 * one Person. See createStoryFromStoriesPageAction below for the
 * multi-person form on the family-wide /stories page.
 */
export async function createStoryAction(
  familyId: string,
  personId: string,
  _prevState: StoryFormState,
  formData: FormData,
): Promise<StoryFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Сессия истекла — войдите заново." };

  const member = await requireFamilyAccess(
    familyId,
    session.user.id,
    "contributor",
  );
  if (!canCreate(member.role, "story")) {
    return { error: "У вас нет прав на добавление историй." };
  }

  const parsed = createStorySchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    privacyLevel: formData.get("privacyLevel") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  await addStory({
    familyId,
    authorId: session.user.id,
    title: parsed.data.title,
    body: parsed.data.body,
    privacyLevel: parsed.data.privacyLevel,
    personIds: [personId],
  });

  const familySlug = await getFamilySlugById(familyId);
  const personSlug = await getPersonSlugById(personId, familyId);
  revalidatePath(`/families/${familySlug}/people/${personSlug}`);
  return {};
}

export async function deleteStoryAction(
  familyId: string,
  personId: string,
  storyId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");

  const member = await requireFamilyAccess(
    familyId,
    session.user.id,
    "contributor",
  );

  const story = await getStory(storyId, familyId);
  if (!story) return;
  if (
    !canDelete(
      { userId: session.user.id, role: member.role },
      { privacyLevel: story.privacyLevel, createdBy: story.authorId },
    )
  ) {
    throw new ForbiddenError("У вас нет прав на удаление этой истории.");
  }

  await removeStory(storyId, familyId, session.user.id);
  const familySlug = await getFamilySlugById(familyId);
  const personSlug = await getPersonSlugById(personId, familyId);
  revalidatePath(`/families/${familySlug}/people/${personSlug}`);
}

/**
 * "Add a story" from the family-wide /stories page — unlike
 * createStoryAction (bound to one Person's profile), this accepts any
 * number of linked people (including zero — a story doesn't strictly need
 * a person attached) and redirects to the new story's own page on success
 * instead of returning to a form state, since there's no natural "stay on
 * this page" destination the way a profile page is for the person-scoped form.
 */
export async function createStoryFromStoriesPageAction(
  familyId: string,
  _prevState: StoryFormState,
  formData: FormData,
): Promise<StoryFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Сессия истекла — войдите заново." };

  const member = await requireFamilyAccess(
    familyId,
    session.user.id,
    "contributor",
  );
  if (!canCreate(member.role, "story")) {
    return { error: "У вас нет прав на добавление историй." };
  }

  const parsed = createStorySchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    privacyLevel: formData.get("privacyLevel") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  const personIds = formData.getAll("personId").map(String).filter(Boolean);

  const { slug } = await addStory({
    familyId,
    authorId: session.user.id,
    title: parsed.data.title,
    body: parsed.data.body,
    privacyLevel: parsed.data.privacyLevel,
    personIds,
  });

  const familySlug = await getFamilySlugById(familyId);
  revalidatePath(`/families/${familySlug}/stories`);
  redirect(`/families/${familySlug}/stories/${slug}`);
}

/**
 * Edits a story from its own detail/edit page (/stories/[storySlug]/edit)
 * — accepts the same multi-person picker as createStoryFromStoriesPageAction
 * and redirects back to the story's own page on success. The story's own
 * slug never changes on edit (matching renamePersonSlug's separation of
 * "rename the URL" from "edit the content" — this action does the latter
 * only).
 */
export async function updateStoryAction(
  familyId: string,
  storyId: string,
  _prevState: StoryFormState,
  formData: FormData,
): Promise<StoryFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Сессия истекла — войдите заново." };

  const member = await requireFamilyAccess(
    familyId,
    session.user.id,
    "contributor",
  );

  const existing = await getStory(storyId, familyId);
  if (!existing) return { error: "История не найдена." };
  if (
    !canEdit(
      { userId: session.user.id, role: member.role },
      { privacyLevel: existing.privacyLevel, createdBy: existing.authorId },
    )
  ) {
    return { error: "У вас нет прав на редактирование этой истории." };
  }

  const parsed = createStorySchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    privacyLevel: formData.get("privacyLevel") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  const personIds = formData.getAll("personId").map(String).filter(Boolean);

  await editStory(storyId, familyId, session.user.id, {
    title: parsed.data.title,
    body: parsed.data.body,
    privacyLevel: parsed.data.privacyLevel,
    personIds,
  });

  const familySlug = await getFamilySlugById(familyId);
  revalidatePath(`/families/${familySlug}/stories/${existing.slug}`);
  redirect(`/families/${familySlug}/stories/${existing.slug}`);
}

/**
 * Deletes a story from its own detail page (/stories/[storySlug]) —
 * redirects back to the family-wide /stories list on success, unlike
 * deleteStoryAction above (which stays on a Person's profile since that
 * page survives the story's deletion).
 */
export async function deleteStoryFromStoriesPageAction(
  familyId: string,
  storyId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");

  const member = await requireFamilyAccess(
    familyId,
    session.user.id,
    "contributor",
  );

  const story = await getStory(storyId, familyId);
  if (!story) return;
  if (
    !canDelete(
      { userId: session.user.id, role: member.role },
      { privacyLevel: story.privacyLevel, createdBy: story.authorId },
    )
  ) {
    throw new ForbiddenError("У вас нет прав на удаление этой истории.");
  }

  await removeStory(storyId, familyId, session.user.id);
  const familySlug = await getFamilySlugById(familyId);
  revalidatePath(`/families/${familySlug}/stories`);
  redirect(`/families/${familySlug}/stories`);
}
