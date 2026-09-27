"use server";

import { getErrorMessage } from "@/i18n/errors";
import { getLocale } from "next-intl/server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getFamilySlugById } from "@/domain/family/family.service";
import {
  addPerson,
  addPlaceholderPerson,
  getPersonSlugById,
} from "@/domain/person/person.service";
import {
  addParentChild,
  addPartnership,
  editPartnershipStartDate,
  editPartnershipEndDate,
  removeParentChild,
  removePartnership,
  setPartnershipStatus,
  RelationshipValidationError,
  type ParentRole,
} from "@/domain/relationship/relationship.service";
import { getPartnershipById } from "@/domain/relationship/relationship.repository";
import { addPartnershipSchema } from "@/lib/validation/relationship";
import {
  comparePartialDates,
  type PartialDate,
} from "@/domain/shared/partial-date";

export interface RelationshipFormState {
  error?: string;
}

type RelativeKind = "parent" | "child" | "spouse";

/**
 * Resolves the "other person" side of a new relationship: either an existing
 * Person (picked from a list) or a brand-new one created inline — which may
 * itself be a placeholder ("unnamed son", "unknown parent") with no name at
 * all. Either way we end up with a personId to link.
 */
async function resolveOtherPersonId(
  familyId: string,
  userId: string,
  formData: FormData,
): Promise<string> {
  const existingPersonId = formData.get("existingPersonId");
  if (typeof existingPersonId === "string" && existingPersonId.length > 0) {
    return existingPersonId;
  }
  // «Уже есть в семье» with nobody picked must not fall through to creating
  // a brand-new nameless Person below — the picker is a search box now, not
  // a `required` <select>, so an empty submit can actually reach here.
  if (formData.get("mode") === "existing") {
    throw new RelationshipValidationError("pickFamilyMember");
  }

  const isPlaceholder = formData.get("isPlaceholder") === "on";
  const firstName =
    (formData.get("newFirstName") as string | null)?.trim() || undefined;
  const lastName =
    (formData.get("newLastName") as string | null)?.trim() || undefined;

  if (isPlaceholder) {
    const placeholder = await addPlaceholderPerson(familyId, userId, {
      label: firstName
        ? `${firstName}${lastName ? ` ${lastName}` : ""}`
        : undefined,
    });
    return placeholder.id;
  }

  const created = await addPerson(
    familyId,
    userId,
    { firstName, lastName },
    await getLocale(),
  );
  return created.id;
}

/**
 * Parses an optional partnership date's fields (`startDate…` — the
 * wedding, or `endDate…` — when the marriage ended) straight off the raw
 * FormData (not via partialDateFromFormData) so "month/day filled, year
 * blank" can be told apart from "nothing filled in at all" and rejected
 * rather than silently discarded — see addPartnershipSchema's own doc.
 * Returns `null` for "no date given" (valid — a partnership can exist with
 * no known date) or throws RelationshipValidationError if a year is missing
 * while month/day are present.
 */
function parsePartnershipDate(
  formData: FormData,
  prefix: "startDate" | "endDate" = "startDate",
): PartialDate | null {
  const yearRaw = formData.get(`${prefix}Year`);
  const monthRaw = formData.get(`${prefix}Month`);
  const dayRaw = formData.get(`${prefix}Day`);
  const isApproximate = formData.get(`${prefix}Approximate`) === "on";

  const anyFieldFilled = [yearRaw, monthRaw, dayRaw].some(
    (value) => typeof value === "string" && value !== "",
  );
  if (!anyFieldFilled) return null;

  const parsed = addPartnershipSchema.safeParse({
    startDate: {
      year: yearRaw || undefined,
      month: monthRaw || undefined,
      day: dayRaw || undefined,
      isApproximate,
    },
  });

  if (!parsed.success) {
    throw new RelationshipValidationError(
      parsed.error.issues[0]?.message ?? "dateInvalid",
    );
  }

  const date = parsed.data.startDate;
  if (!date || date.year === undefined) return null;

  return {
    year: date.year,
    month: date.month ?? null,
    day: date.day ?? null,
    precision: date.day || date.month ? "exact" : "year_only",
    isApproximate: date.isApproximate ?? false,
  };
}

export async function addRelativeAction(
  familyId: string,
  personId: string,
  kind: RelativeKind,
  _prevState: RelationshipFormState,
  formData: FormData,
): Promise<RelationshipFormState> {
  const session = await auth();
  if (!session?.user)
    return { error: (await getErrorMessage())("sessionExpired") };

  await requireFamilyAccess(familyId, session.user.id, "editor");

  try {
    const otherPersonId = await resolveOtherPersonId(
      familyId,
      session.user.id,
      formData,
    );
    const parentRole =
      (formData.get("parentRole") as ParentRole | null) ?? undefined;

    if (kind === "parent") {
      await addParentChild(
        familyId,
        session.user.id,
        {
          parentId: otherPersonId,
          childId: personId,
          parentRole,
        },
        await getLocale(),
      );
    } else if (kind === "child") {
      await addParentChild(
        familyId,
        session.user.id,
        {
          parentId: personId,
          childId: otherPersonId,
          parentRole,
        },
        await getLocale(),
      );
    } else {
      const startDate = parsePartnershipDate(formData);
      await addPartnership(
        familyId,
        session.user.id,
        {
          person1Id: personId,
          person2Id: otherPersonId,
          startDate,
        },
        await getLocale(),
      );
    }
  } catch (error) {
    if (error instanceof RelationshipValidationError) {
      return { error: (await getErrorMessage())(error.message) };
    }
    throw error;
  }

  const familySlug = await getFamilySlugById(familyId);
  const personSlug = await getPersonSlugById(personId, familyId);
  revalidatePath(`/families/${familySlug}/people/${personSlug}`);
  return {};
}

export async function removeParentChildAction(
  familyId: string,
  personId: string,
  relationshipId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Session expired.");

  await requireFamilyAccess(familyId, session.user.id, "editor");
  await removeParentChild(
    relationshipId,
    familyId,
    session.user.id,
    await getLocale(),
  );
  const familySlug = await getFamilySlugById(familyId);
  const personSlug = await getPersonSlugById(personId, familyId);
  revalidatePath(`/families/${familySlug}/people/${personSlug}`);
}

export async function removePartnershipAction(
  familyId: string,
  personId: string,
  relationshipId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Session expired.");

  await requireFamilyAccess(familyId, session.user.id, "editor");
  await removePartnership(
    relationshipId,
    familyId,
    session.user.id,
    await getLocale(),
  );
  const familySlug = await getFamilySlugById(familyId);
  const personSlug = await getPersonSlugById(personId, familyId);
  revalidatePath(`/families/${familySlug}/people/${personSlug}`);
}

/**
 * Flips a partnership between current and past (divorced) — see
 * setPartnershipStatus's own doc comment. Revalidates both partners' own
 * profile pages (not just `personId`'s) since the Family panel on the OTHER
 * partner's page shows this exact same relationship too, and the tree itself
 * (whichever page rendered it) needs the new dasharray on next load.
 */
export async function setPartnershipStatusAction(
  familyId: string,
  personId: string,
  otherPersonId: string,
  relationshipId: string,
  isCurrent: boolean,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Session expired.");

  await requireFamilyAccess(familyId, session.user.id, "editor");
  await setPartnershipStatus(relationshipId, familyId, isCurrent);
  const familySlug = await getFamilySlugById(familyId);
  const [personSlug, otherPersonSlug] = await Promise.all([
    getPersonSlugById(personId, familyId),
    getPersonSlugById(otherPersonId, familyId),
  ]);
  revalidatePath(`/families/${familySlug}/people/${personSlug}`);
  revalidatePath(`/families/${familySlug}/people/${otherPersonSlug}`);
  revalidatePath(`/families/${familySlug}/tree`);
}

export interface UpdatePartnershipDateFormState {
  error?: string;
}

/**
 * Sets (or clears) an existing partnership's start date — the edit path for
 * partnerships created before this field existed in the UI (see
 * add-relative-form.tsx's spouse flow, which only sets it at creation time)
 * or where it simply wasn't known yet. Same year-required-if-any-part-given
 * validation as creation (parsePartnershipDate/addPartnershipSchema).
 */
export async function updatePartnershipDateAction(
  familyId: string,
  personId: string,
  otherPersonId: string,
  relationshipId: string,
  _prevState: UpdatePartnershipDateFormState,
  formData: FormData,
): Promise<UpdatePartnershipDateFormState> {
  const session = await auth();
  if (!session?.user)
    return { error: (await getErrorMessage())("sessionExpired") };

  await requireFamilyAccess(familyId, session.user.id, "editor");

  let startDate: PartialDate | null;
  try {
    startDate = parsePartnershipDate(formData);
  } catch (error) {
    if (error instanceof RelationshipValidationError) {
      return { error: (await getErrorMessage())(error.message) };
    }
    throw error;
  }

  await editPartnershipStartDate(relationshipId, familyId, startDate);

  const familySlug = await getFamilySlugById(familyId);
  const [personSlug, otherPersonSlug] = await Promise.all([
    getPersonSlugById(personId, familyId),
    getPersonSlugById(otherPersonId, familyId),
  ]);
  revalidatePath(`/families/${familySlug}/people/${personSlug}`);
  revalidatePath(`/families/${familySlug}/people/${otherPersonSlug}`);
  return {};
}

export interface UpdateMarriageFormState {
  error?: string;
  /** Set on success — the EditPanel closes itself. */
  saved?: boolean;
}

/**
 * Saves the «Свадьба» panel opened from a Person's Линия жизни: the
 * wedding date, whether the marriage is still ongoing and — when it isn't —
 * when it ended, in one submit (date and status used to live behind two
 * separate hover-only icons on the spouse row). The status is only written
 * when the switch actually changed — setPartnershipStatus maps «ended» to
 * `divorced`, which would otherwise silently overwrite a
 * `widowed`/`separated` ending on every date edit. An ongoing marriage has
 * no end date, so switching back on clears it.
 */
export async function updateMarriageAction(
  familyId: string,
  personId: string,
  otherPersonId: string,
  relationshipId: string,
  _prevState: UpdateMarriageFormState,
  formData: FormData,
): Promise<UpdateMarriageFormState> {
  const session = await auth();
  if (!session?.user)
    return { error: (await getErrorMessage())("sessionExpired") };

  await requireFamilyAccess(familyId, session.user.id, "editor");
  const existing = await getPartnershipById(relationshipId, familyId);
  if (!existing) return { error: (await getErrorMessage())("generic") };

  const isCurrent = formData.get("isCurrent") === "on";
  let startDate: PartialDate | null;
  let endDate: PartialDate | null;
  try {
    startDate = parsePartnershipDate(formData, "startDate");
    endDate = isCurrent ? null : parsePartnershipDate(formData, "endDate");
    if (startDate && endDate && comparePartialDates(endDate, startDate) < 0) {
      throw new RelationshipValidationError("endBeforeStart");
    }
  } catch (error) {
    if (error instanceof RelationshipValidationError) {
      return { error: (await getErrorMessage())(error.message) };
    }
    throw error;
  }

  await editPartnershipStartDate(relationshipId, familyId, startDate);
  await editPartnershipEndDate(relationshipId, familyId, endDate);
  if (isCurrent !== existing.isCurrent) {
    await setPartnershipStatus(relationshipId, familyId, isCurrent);
  }

  const familySlug = await getFamilySlugById(familyId);
  const [personSlug, otherPersonSlug] = await Promise.all([
    getPersonSlugById(personId, familyId),
    getPersonSlugById(otherPersonId, familyId),
  ]);
  revalidatePath(`/families/${familySlug}/people/${personSlug}`);
  revalidatePath(`/families/${familySlug}/people/${otherPersonSlug}`);
  revalidatePath(`/families/${familySlug}/tree`);
  return { saved: true };
}
