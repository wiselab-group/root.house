"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getFamilySlugById } from "@/domain/family/family.service";
import { createShareLinkSchema } from "@/lib/validation/share-link";
import {
  createShareLink,
  revokeShareLink,
  ShareLinkInvalidError,
  type ExpirationPreset,
  type ShareLinkVisibilityScope,
} from "@/domain/share-link/share-link.service";
import {
  listPublicPersonOptions,
  type PublicPersonOption,
} from "@/domain/share-link/public-tree.service";

/**
 * Owner-only mutating actions for Family Settings → "Ссылки для общего
 * доступа". Mirrors invitation.actions.ts's shape exactly: auth() → early
 * typed-state return → requireFamilyAccess(..., "owner") → zod validation
 * → domain service call → revalidatePath. familyId is always this
 * function's own explicit parameter (bound from the authenticated owner's
 * session context in the settings page), never inferred from any
 * client-supplied scope data.
 *
 * See share-link-access.actions.ts for the SEPARATE, auth()-free anonymous
 * side — deliberately kept in a different file.
 */

export interface CreateShareLinkFormState {
  error?: string;
  fieldErrors?: Partial<Record<"focusPersonId" | "password", string>>;
  shareUrl?: string;
}

export async function createShareLinkAction(
  familyId: string,
  _prevState: CreateShareLinkFormState,
  formData: FormData,
): Promise<CreateShareLinkFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Сессия истекла — войдите заново." };

  await requireFamilyAccess(familyId, session.user.id, "owner");

  const parsed = createShareLinkSchema.safeParse({
    focusPersonId: formData.get("focusPersonId"),
    visibilityScope: formData.get("visibilityScope"),
    expirationPreset: formData.get("expirationPreset"),
    password: formData.get("password") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: CreateShareLinkFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "focusPersonId" || key === "password") {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  try {
    const { shareUrl } = await createShareLink({
      familyId,
      createdBy: session.user.id,
      focusPersonId: parsed.data.focusPersonId,
      visibilityScope: parsed.data.visibilityScope as ShareLinkVisibilityScope,
      expirationPreset: parsed.data.expirationPreset as ExpirationPreset,
      password: parsed.data.password || undefined,
    });

    const slug = await getFamilySlugById(familyId);
    if (slug) revalidatePath(`/families/${slug}/settings`);
    return { shareUrl };
  } catch (error) {
    if (error instanceof ShareLinkInvalidError) {
      return { fieldErrors: { focusPersonId: error.message } };
    }
    throw error;
  }
}

export async function revokeShareLinkAction(
  familyId: string,
  shareLinkId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");

  await requireFamilyAccess(familyId, session.user.id, "owner");
  await revokeShareLink(shareLinkId, familyId);

  const slug = await getFamilySlugById(familyId);
  if (slug) revalidatePath(`/families/${slug}/settings`);
}

/**
 * Backs the "focus person" picker in the create-link form — deliberately
 * its own action rather than reusing searchPeopleForTraceAction, which
 * searches the WHOLE family with no privacy filter (see
 * public-tree.service.ts::listPublicPersonOptions's own doc comment). Takes
 * the form's currently-selected visibilityScope so the picker only ever
 * offers people visible under the link actually being created.
 */
export async function listPublicPersonsAction(
  familyId: string,
  visibilityScope: ShareLinkVisibilityScope,
): Promise<PublicPersonOption[]> {
  const session = await auth();
  if (!session?.user) return [];

  await requireFamilyAccess(familyId, session.user.id, "owner");
  return listPublicPersonOptions(familyId, visibilityScope);
}
