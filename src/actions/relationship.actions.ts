"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getFamilySlugById } from "@/domain/family/family.service";
import { addPerson, addPlaceholderPerson, getPersonSlugById } from "@/domain/person/person.service";
import {
  addParentChild,
  addPartnership,
  removeParentChild,
  removePartnership,
  RelationshipValidationError,
  type ParentRole,
} from "@/domain/relationship/relationship.service";

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
  const firstName = (formData.get("newFirstName") as string | null)?.trim() || undefined;
  const lastName = (formData.get("newLastName") as string | null)?.trim() || undefined;

  if (isPlaceholder) {
    const placeholder = await addPlaceholderPerson(familyId, userId, {
      label: firstName ? `${firstName}${lastName ? ` ${lastName}` : ""}` : undefined,
    });
    return placeholder.id;
  }

  const created = await addPerson(familyId, userId, { firstName, lastName });
  return created.id;
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
    const otherPersonId = await resolveOtherPersonId(familyId, session.user.id, formData);
    const parentRole = (formData.get("parentRole") as ParentRole | null) ?? undefined;

    if (kind === "parent") {
      await addParentChild(familyId, { parentId: otherPersonId, childId: personId, parentRole });
    } else if (kind === "child") {
      await addParentChild(familyId, { parentId: personId, childId: otherPersonId, parentRole });
    } else {
      await addPartnership(familyId, { person1Id: personId, person2Id: otherPersonId });
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
  await removeParentChild(relationshipId, familyId);
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
  await removePartnership(relationshipId, familyId);
  const familySlug = await getFamilySlugById(familyId);
  const personSlug = await getPersonSlugById(personId, familyId);
  revalidatePath(`/families/${familySlug}/people/${personSlug}`);
}
