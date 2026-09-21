"use server";

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
  removeParentChild,
  removePartnership,
  setPartnershipStatus,
  RelationshipValidationError,
  type ParentRole,
} from "@/domain/relationship/relationship.service";
import { addPartnershipSchema } from "@/lib/validation/relationship";
import type { PartialDate } from "@/domain/shared/partial-date";

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

  const created = await addPerson(familyId, userId, { firstName, lastName });
  return created.id;
}

/**
 * Parses the optional partnership start-date fields straight off the raw
 * FormData (not via partialDateFromFormData) so "month/day filled, year
 * blank" can be told apart from "nothing filled in at all" and rejected
 * rather than silently discarded — see addPartnershipSchema's own doc.
 * Returns `null` for "no date given" (valid — a partnership can exist with
 * no known date) or throws RelationshipValidationError if a year is missing
 * while month/day are present.
 */
function parsePartnershipStartDate(formData: FormData): PartialDate | null {
  const yearRaw = formData.get("startDateYear");
  const monthRaw = formData.get("startDateMonth");
  const dayRaw = formData.get("startDateDay");
  const isApproximate = formData.get("startDateApproximate") === "on";

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
      parsed.error.issues[0]?.message ?? "Некорректная дата.",
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
  if (!session?.user) return { error: "Сессия истекла — войдите заново." };

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
      await addParentChild(familyId, session.user.id, {
        parentId: otherPersonId,
        childId: personId,
        parentRole,
      });
    } else if (kind === "child") {
      await addParentChild(familyId, session.user.id, {
        parentId: personId,
        childId: otherPersonId,
        parentRole,
      });
    } else {
      const startDate = parsePartnershipStartDate(formData);
      await addPartnership(familyId, session.user.id, {
        person1Id: personId,
        person2Id: otherPersonId,
        startDate,
      });
    }
  } catch (error) {
    if (error instanceof RelationshipValidationError) {
      return { error: error.message };
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
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");

  await requireFamilyAccess(familyId, session.user.id, "editor");
  await removeParentChild(relationshipId, familyId, session.user.id);
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
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");

  await requireFamilyAccess(familyId, session.user.id, "editor");
  await removePartnership(relationshipId, familyId, session.user.id);
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
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");

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
