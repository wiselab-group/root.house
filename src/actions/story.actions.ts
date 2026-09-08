"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { ForbiddenError } from "@/domain/family/errors";
import { canCreate, canDelete } from "@/domain/family/permissions";
import { getFamilySlugById } from "@/domain/family/family.service";
import { getPersonSlugById } from "@/domain/person/person.service";
import { createStorySchema } from "@/lib/validation/story";
import { addStory, getStory, removeStory } from "@/domain/story/story.service";

export interface StoryFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * MVP scope is "add a story from a Person's profile" — a story linked to
 * exactly that one Person. story.service.ts's personIds array already
 * supports multi-person stories (e.g. a memory about several relatives at
 * once), just not wired into this form yet — same pattern as event.actions.ts.
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

  await removeStory(storyId, familyId);
  const familySlug = await getFamilySlugById(familyId);
  const personSlug = await getPersonSlugById(personId, familyId);
  revalidatePath(`/families/${familySlug}/people/${personSlug}`);
}
