"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { ForbiddenError } from "@/domain/family/errors";
import { canEdit } from "@/domain/family/permissions";
import { getFamilySlugById } from "@/domain/family/family.service";
import {
  createPersonSchema,
  createPlaceholderPersonSchema,
} from "@/lib/validation/person";
import {
  addPerson,
  addPlaceholderPerson,
  editPerson,
  getPerson,
  getPersonSlugById,
  removePerson,
} from "@/domain/person/person.service";
import { partialDateFromFormData } from "@/domain/shared/partial-date";
import { resolvePlaceFields, revalidatePlacePages } from "@/lib/place-choice";

/** PersonForm's PlaceFields — each may carry a new place to create on save. */
const PLACE_FIELDS = [
  "birthPlaceId",
  "deathPlaceId",
  "residencePlaceId",
] as const;

export interface PersonFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Set only on success — the id/slug of the newly created person, plus the
   *  family's own slug, so the client can navigate itself (see below) rather
   *  than this action redirecting. */
  created?: { personId: string; personSlug: string; familySlug: string };
}

/**
 * Does NOT redirect on success (unlike updatePersonAction) — PersonForm's
 * create flow needs the new person's id back on the client first, to
 * optionally upload a just-picked avatar file via /api/media/upload (which
 * requires an existing personId) BEFORE navigating to the profile page.
 * Navigation itself happens client-side afterwards (see PersonForm's
 * submit handling for the "showPhotoPicker" case) via router.push to the
 * same URL this used to redirect() to.
 */
export async function createPersonAction(
  familyId: string,
  _prevState: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Сессия истекла — войдите заново." };

  await requireFamilyAccess(familyId, session.user.id, "editor");

  const parsed = createPersonSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    middleName: formData.get("middleName"),
    maidenName: formData.get("maidenName"),
    gender: formData.get("gender") || undefined,
    isLiving: formData.get("isLiving") === "on",
    description: formData.get("description"),
    religion: formData.get("religion"),
    nationality: formData.get("nationality"),
    deathCause: formData.get("deathCause"),
    privacyLevel: formData.get("privacyLevel") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  const places = await resolvePlaceFields(familyId, formData, PLACE_FIELDS);
  const person = await addPerson(familyId, session.user.id, {
    firstName: parsed.data.firstName || undefined,
    lastName: parsed.data.lastName || undefined,
    middleName: parsed.data.middleName || undefined,
    maidenName: parsed.data.maidenName || undefined,
    gender: parsed.data.gender,
    isLiving: parsed.data.isLiving,
    description: parsed.data.description || undefined,
    religion: parsed.data.religion || undefined,
    nationality: parsed.data.nationality || undefined,
    birthDate: partialDateFromFormData(formData, "birth"),
    deathDate: partialDateFromFormData(formData, "death"),
    birthPlaceId: places.ids.birthPlaceId ?? undefined,
    deathPlaceId: places.ids.deathPlaceId ?? undefined,
    residencePlaceId: places.ids.residencePlaceId ?? undefined,
    deathCause: parsed.data.deathCause || undefined,
    privacyLevel: parsed.data.privacyLevel,
  });

  const familySlug = await getFamilySlugById(familyId);
  revalidatePath(`/families/${familySlug}/people`);
  if (places.createdAny) revalidatePlacePages(familySlug);
  return {
    created: {
      personId: person.id,
      personSlug: person.slug,
      familySlug: familySlug ?? "",
    },
  };
}

export interface CreatePlaceholderFormState {
  error?: string;
}

/**
 * Creates a placeholder Person (e.g. "unnamed son", "unknown parent") from a
 * minimal quick-add form used inline while building out relationships.
 */
export async function createPlaceholderPersonAction(
  familyId: string,
  _prevState: CreatePlaceholderFormState,
  formData: FormData,
): Promise<CreatePlaceholderFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Сессия истекла — войдите заново." };

  await requireFamilyAccess(familyId, session.user.id, "editor");

  const parsed = createPlaceholderPersonSchema.safeParse({
    label: formData.get("label"),
    gender: formData.get("gender") || undefined,
  });

  if (!parsed.success) {
    return { error: "Не удалось создать запись — проверьте введённые данные." };
  }

  await addPlaceholderPerson(familyId, session.user.id, parsed.data);

  const slug = await getFamilySlugById(familyId);
  revalidatePath(`/families/${slug}/people`);
  return {};
}

export async function deletePersonAction(
  familyId: string,
  personId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");

  const member = await requireFamilyAccess(familyId, session.user.id, "editor");

  // Person stays editor-and-up for the create/edit/delete floor (no
  // CONTRIBUTOR nuance — Person isn't a ContributableEntity), but PRIVATE
  // visibility must still apply uniformly across every entity type (spec
  // §6): an editor who is neither owner nor creator must not be able to
  // mutate a PRIVATE Person just because they know/guess its id.
  const person = await getPerson(personId, familyId);
  if (!person) return;
  if (
    !canEdit(
      { userId: session.user.id, role: member.role },
      { privacyLevel: person.privacyLevel, createdBy: person.createdBy },
    )
  ) {
    throw new ForbiddenError("У вас нет прав на удаление этой записи.");
  }

  await removePerson(personId, familyId, session.user.id);

  const slug = await getFamilySlugById(familyId);
  revalidatePath(`/families/${slug}/people`);
  redirect(`/families/${slug}/people`);
}

export async function updatePersonAction(
  familyId: string,
  personId: string,
  _prevState: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Сессия истекла — войдите заново." };

  const member = await requireFamilyAccess(familyId, session.user.id, "editor");

  const existingPerson = await getPerson(personId, familyId);
  if (!existingPerson) return { error: "Человек не найден." };
  if (
    !canEdit(
      { userId: session.user.id, role: member.role },
      {
        privacyLevel: existingPerson.privacyLevel,
        createdBy: existingPerson.createdBy,
      },
    )
  ) {
    return { error: "У вас нет прав на редактирование этой записи." };
  }

  const parsed = createPersonSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    middleName: formData.get("middleName"),
    maidenName: formData.get("maidenName"),
    gender: formData.get("gender") || undefined,
    isLiving: formData.get("isLiving") === "on",
    description: formData.get("description"),
    religion: formData.get("religion"),
    nationality: formData.get("nationality"),
    deathCause: formData.get("deathCause"),
    privacyLevel: formData.get("privacyLevel") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  const places = await resolvePlaceFields(familyId, formData, PLACE_FIELDS);
  const updated = await editPerson(personId, familyId, session.user.id, {
    firstName: parsed.data.firstName || null,
    lastName: parsed.data.lastName || null,
    middleName: parsed.data.middleName || null,
    maidenName: parsed.data.maidenName || null,
    gender: parsed.data.gender,
    isLiving: parsed.data.isLiving,
    description: parsed.data.description || null,
    religion: parsed.data.religion || null,
    nationality: parsed.data.nationality || null,
    birthDate: partialDateFromFormData(formData, "birth") ?? null,
    deathDate: partialDateFromFormData(formData, "death") ?? null,
    birthPlaceId: places.ids.birthPlaceId,
    deathPlaceId: places.ids.deathPlaceId,
    residencePlaceId: places.ids.residencePlaceId,
    deathCause: parsed.data.deathCause || null,
    privacyLevel: parsed.data.privacyLevel,
  });

  if (!updated) {
    return { error: "Человек не найден." };
  }

  const familySlug = await getFamilySlugById(familyId);
  const personSlug = await getPersonSlugById(personId, familyId);
  revalidatePath(`/families/${familySlug}/people/${personSlug}`);
  if (places.createdAny) revalidatePlacePages(familySlug);
  redirect(`/families/${familySlug}/people/${personSlug}`);
}
