"use server";

import { getErrorMessage } from "@/i18n/errors";
import { getValidationMessage } from "@/i18n/validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { ForbiddenError } from "@/domain/family/errors";
import { canCreate, canDelete } from "@/domain/family/permissions";
import { getFamilySlugById } from "@/domain/family/family.service";
import { getPersonSlugById } from "@/domain/person/person.service";
import {
  createStorySchema,
  storyDraftContentSchema,
} from "@/lib/validation/story";
import {
  canEditStory,
  createDraftStory,
  discardMyStoryDraft,
  editStory,
  getStory,
  publishStory,
  removeStory,
  saveStoryDraftContent,
} from "@/domain/story/story.service";

export interface StoryFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function deleteStoryAction(
  familyId: string,
  personId: string,
  storyId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Session expired.");

  const member = await requireFamilyAccess(
    familyId,
    session.user.id,
    "contributor",
  );

  const story = await getStory(storyId, familyId);
  if (!story) return;
  if (
    // A draft is its author's alone — not even the owner's to delete.
    (story.status === "draft" && story.authorId !== session.user.id) ||
    !canDelete(
      { userId: session.user.id, role: member.role },
      { privacyLevel: story.privacyLevel, createdBy: story.authorId },
    )
  ) {
    throw new ForbiddenError("You may not delete this story.");
  }

  await removeStory(storyId, familyId, session.user.id);
  const familySlug = await getFamilySlugById(familyId);
  const personSlug = await getPersonSlugById(personId, familyId);
  revalidatePath(`/families/${familySlug}/people/${personSlug}`);
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
  if (!session?.user)
    return { error: (await getErrorMessage())("sessionExpired") };

  const member = await requireFamilyAccess(
    familyId,
    session.user.id,
    "contributor",
  );

  const existing = await getStory(storyId, familyId);
  if (!existing) return { error: (await getErrorMessage())("storyNotFound") };
  if (!canEditStory({ userId: session.user.id, role: member.role }, existing)) {
    return { error: (await getErrorMessage())("noStoryEdit") };
  }

  const parsed = createStorySchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    privacyLevel: formData.get("privacyLevel") || undefined,
  });

  if (!parsed.success) {
    const message = await getValidationMessage();
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = message(issue);
    }
    return { fieldErrors };
  }

  const personIds = formData.getAll("personId").map(String).filter(Boolean);

  if (existing.status === "draft") {
    const { slug } = await publishStory(existing, session.user.id, {
      title: parsed.data.title,
      body: parsed.data.body,
      privacyLevel: parsed.data.privacyLevel,
      personIds,
    });
    const familySlug = await getFamilySlugById(familyId);
    revalidatePath(`/families/${familySlug}/stories`);
    for (const personId of personIds) {
      const personSlug = await getPersonSlugById(personId, familyId);
      revalidatePath(`/families/${familySlug}/people/${personSlug}`);
    }
    redirect(`/families/${familySlug}/stories/${slug}`);
  }

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
  if (!session?.user) throw new Error("Session expired.");

  const member = await requireFamilyAccess(
    familyId,
    session.user.id,
    "contributor",
  );

  const story = await getStory(storyId, familyId);
  if (!story) return;
  if (
    // A draft is its author's alone — not even the owner's to delete.
    (story.status === "draft" && story.authorId !== session.user.id) ||
    !canDelete(
      { userId: session.user.id, role: member.role },
      { privacyLevel: story.privacyLevel, createdBy: story.authorId },
    )
  ) {
    throw new ForbiddenError("You may not delete this story.");
  }

  await removeStory(storyId, familyId, session.user.id);
  const familySlug = await getFamilySlugById(familyId);
  revalidatePath(`/families/${familySlug}/stories`);
  redirect(`/families/${familySlug}/stories`);
}

/**
 * «Новая история» — from /stories (no people) or a Person's profile (that
 * person, via a hidden personId field): creates the author's draft and
 * opens the full-page editor on it, so the story is written where long
 * text belongs and autosaved from the first keystroke.
 */
export async function createDraftStoryAction(
  familyId: string,
  formData: FormData,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Session expired.");

  const member = await requireFamilyAccess(
    familyId,
    session.user.id,
    "contributor",
  );
  if (!canCreate(member.role, "story")) {
    throw new ForbiddenError("You may not create stories.");
  }

  const personIds = formData.getAll("personId").map(String).filter(Boolean);
  const { slug } = await createDraftStory(familyId, session.user.id, personIds);
  const familySlug = await getFamilySlugById(familyId);
  redirect(`/families/${familySlug}/stories/${slug}/edit`);
}

export type AutosaveStoryResult = { ok: true } | { ok: false; error: string };

/**
 * The story editor's autosave, called every few seconds while typing — see
 * story.service.ts::saveStoryDraftContent for where it writes. Same
 * auth → family access → canEditStory chain as a real save; lenient
 * content rules (an unfinished draft may have no title yet), only the
 * length limits. Doesn't revalidate: nothing anyone else sees changed.
 */
export async function autosaveStoryAction(
  familyId: string,
  storyId: string,
  content: { title: string; body: string },
): Promise<AutosaveStoryResult> {
  const session = await auth();
  if (!session?.user)
    return { ok: false, error: (await getErrorMessage())("sessionExpired") };

  const member = await requireFamilyAccess(
    familyId,
    session.user.id,
    "contributor",
  );
  const story = await getStory(storyId, familyId);
  if (
    !story ||
    !canEditStory({ userId: session.user.id, role: member.role }, story)
  ) {
    return { ok: false, error: (await getErrorMessage())("noStoryEdit") };
  }

  const parsed = storyDraftContentSchema.safeParse(content);
  if (!parsed.success) {
    const message = await getValidationMessage();
    return { ok: false, error: message(parsed.error.issues[0]) };
  }

  await saveStoryDraftContent(story, session.user.id, parsed.data);
  return { ok: true };
}

/** «Удалить черновик» for autosaved edits to a PUBLISHED story — drops
 *  this user's story_drafts row; the published text is untouched. */
export async function discardStoryDraftAction(
  familyId: string,
  storyId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Session expired.");
  await requireFamilyAccess(familyId, session.user.id, "contributor");
  await discardMyStoryDraft(storyId, session.user.id, familyId);
}
