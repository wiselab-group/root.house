"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getFamilySlugById } from "@/domain/family/family.service";
import { createStorySchema } from "@/lib/validation/story";
import { addStory, removeStory } from "@/domain/story/story.service";

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

  await requireFamilyAccess(familyId, session.user.id, "editor");

  const parsed = createStorySchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
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
    personIds: [personId],
  });

  const slug = await getFamilySlugById(familyId);
  revalidatePath(`/families/${slug}/people/${personId}`);
  return {};
}

export async function deleteStoryAction(familyId: string, personId: string, storyId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");

  await requireFamilyAccess(familyId, session.user.id, "editor");
  await removeStory(storyId, familyId);
  const slug = await getFamilySlugById(familyId);
  revalidatePath(`/families/${slug}/people/${personId}`);
}
