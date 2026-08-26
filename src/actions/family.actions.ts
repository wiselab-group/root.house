"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import {
  createFamilySchema,
  deleteFamilySchema,
  updateFamilyDetailsSchema,
  updateFamilySlugSchema,
} from "@/lib/validation/family";
import {
  createFamily,
  deleteFamily,
  getFamilySlugById,
  getFamilySummary,
  updateFamilyDetails,
  updateFamilySlug,
  updateDefaultFocusPerson,
} from "@/domain/family/family.service";
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

export interface UpdateFamilyDetailsFormState {
  success?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"name" | "description", string>>;
}

export async function updateFamilyDetailsAction(
  familyId: string,
  _prevState: UpdateFamilyDetailsFormState,
  formData: FormData,
): Promise<UpdateFamilyDetailsFormState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Сессия истекла — войдите заново." };
  }

  // Cosmetic fields (not the public slug/URL) — any editor may change them.
  await requireFamilyAccess(familyId, session.user.id, "editor");

  const parsed = updateFamilyDetailsSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    const fieldErrors: UpdateFamilyDetailsFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "name" || key === "description") {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  await updateFamilyDetails(familyId, {
    name: parsed.data.name,
    description: parsed.data.description || undefined,
  });

  const slug = await getFamilySlugById(familyId);
  if (slug) revalidatePath(`/families/${slug}`);

  return { success: true };
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

  const parsed = updateFamilySlugSchema.safeParse({
    slug: formData.get("slug"),
  });

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

export interface DeleteFamilyFormState {
  error?: string;
  fieldErrors?: Partial<Record<"confirmName", string>>;
}

/**
 * Permanently deletes the family and everything in it (people, relationships,
 * events, media, stories, places — see family.service.ts::deleteFamily).
 * Irreversible, so this is deliberately owner-only and requires the caller
 * to retype the family's exact current name as confirmation, on top of the
 * confirmation dialog already required client-side (see
 * FamilyDeleteSettings) — belt-and-suspenders against a misclick nuking a
 * whole archive.
 */
export async function deleteFamilyAction(
  familyId: string,
  _prevState: DeleteFamilyFormState,
  formData: FormData,
): Promise<DeleteFamilyFormState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Сессия истекла — войдите заново." };
  }

  await requireFamilyAccess(familyId, session.user.id, "owner");

  const parsed = deleteFamilySchema.safeParse({
    confirmName: formData.get("confirmName"),
  });

  if (!parsed.success) {
    return { fieldErrors: { confirmName: parsed.error.issues[0]?.message } };
  }

  const family = await getFamilySummary(familyId);
  if (!family) {
    // Already gone (e.g. deleted from another tab) — nothing left to do.
    redirect("/families");
  }

  if (parsed.data.confirmName !== family.name) {
    return {
      fieldErrors: {
        confirmName: "Название не совпадает — введите его точно как показано.",
      },
    };
  }

  await deleteFamily(familyId);

  revalidatePath("/families", "layout");
  redirect("/families");
}

/**
 * Sets (personId) or clears (null) the CALLER's own default focus person —
 * a per-user tree-viewing preference (see family.service.ts), not a
 * family-wide setting, so this only ever needs 'viewer' access (every
 * member may set their own preference regardless of role) and never
 * touches any other member's row. Not a useActionState form action (no text
 * fields to preserve on error) — the combobox in the settings UI calls this
 * directly and handles the result itself.
 */
export async function updateDefaultFocusPersonAction(
  familyId: string,
  personId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "Сессия истекла — войдите заново." };
  }

  await requireFamilyAccess(familyId, session.user.id, "viewer");

  const result = await updateDefaultFocusPerson(
    familyId,
    session.user.id,
    personId,
  );
  if (!result.ok) return result;

  revalidatePath(`/families`, "layout");
  return { ok: true };
}
