"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { createFamilySchema, updateFamilySlugSchema } from "@/lib/validation/family";
import { createFamily, updateFamilySlug } from "@/domain/family/family.service";
import { SlugTakenError } from "@/domain/family/errors";

export interface CreateFamilyFormState {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "description", string>>;
}

export async function createFamilyAction(
  _prevState: CreateFamilyFormState,
  formData: FormData,
): Promise<CreateFamilyFormState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Сессия истекла — войдите заново." };
  }

  const parsed = createFamilySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    const fieldErrors: CreateFamilyFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "name" || key === "description") {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const family = await createFamily(session.user.id, {
    name: parsed.data.name,
    description: parsed.data.description || undefined,
  });

  redirect(`/families/${family.slug}`);
}

export interface UpdateFamilySlugFormState {
  error?: string;
  fieldErrors?: Partial<Record<"slug", string>>;
}

export async function updateFamilySlugAction(
  familyId: string,
  _prevState: UpdateFamilySlugFormState,
  formData: FormData,
): Promise<UpdateFamilySlugFormState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Сессия истекла — войдите заново." };
  }

  // Only an owner may change the family's public URL — an editor/viewer
  // changing it out from under everyone else's bookmarks/shared links would
  // be surprising and is a meaningfully more sensitive action than editing
  // people/events, hence 'owner' rather than the usual 'editor' minimum.
  await requireFamilyAccess(familyId, session.user.id, "owner");

  const parsed = updateFamilySlugSchema.safeParse({ slug: formData.get("slug") });

  if (!parsed.success) {
    const fieldErrors: UpdateFamilySlugFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      if (issue.path[0] === "slug") fieldErrors.slug = issue.message;
    }
    return { fieldErrors };
  }

  try {
    await updateFamilySlug(familyId, parsed.data.slug);
  } catch (error) {
    if (error instanceof SlugTakenError) {
      return { fieldErrors: { slug: error.message } };
    }
    throw error;
  }

  // The URL segment itself just changed — redirect to the new slug so the
  // address bar reflects it immediately, rather than returning {success}
  // and leaving the (now stale) old slug displayed in the browser.
  revalidatePath(`/families/${parsed.data.slug}`);
  redirect(`/families/${parsed.data.slug}`);
}
