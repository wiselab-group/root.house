"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { ForbiddenError } from "@/domain/family/errors";
import { canCreate, canDelete } from "@/domain/family/permissions";
import { getFamilySlugById } from "@/domain/family/family.service";
import { getPersonSlugById } from "@/domain/person/person.service";
import { createEventSchema } from "@/lib/validation/event";
import { addEvent, getEvent, removeEvent } from "@/domain/event/event.service";
import { partialDateFromFormData } from "@/domain/shared/partial-date";

export interface EventFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Creates an Event with `personId` as its sole participant (role: 'subject').
 * MVP scope is "add an event from a Person's timeline" — multi-participant
 * events (e.g. a marriage with both spouses) are a natural extension of
 * event.service.ts's participants array, just not wired into this form yet.
 */
export async function createEventAction(
  familyId: string,
  personId: string,
  _prevState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Сессия истекла — войдите заново." };

  const member = await requireFamilyAccess(
    familyId,
    session.user.id,
    "contributor",
  );
  if (!canCreate(member.role, "event")) {
    return { error: "У вас нет прав на добавление событий." };
  }

  const parsed = createEventSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    description: formData.get("description"),
    placeId: formData.get("placeId"),
    privacyLevel: formData.get("privacyLevel") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  await addEvent({
    familyId,
    createdBy: session.user.id,
    type: parsed.data.type,
    title: parsed.data.title,
    description: parsed.data.description || undefined,
    date: partialDateFromFormData(formData, "date"),
    endDate: partialDateFromFormData(formData, "endDate"),
    placeId: parsed.data.placeId || undefined,
    privacyLevel: parsed.data.privacyLevel,
    participants: [{ personId, role: "subject" }],
  });

  const familySlug = await getFamilySlugById(familyId);
  const personSlug = await getPersonSlugById(personId, familyId);
  revalidatePath(`/families/${familySlug}/people/${personSlug}`);
  return {};
}

export async function deleteEventAction(
  familyId: string,
  personId: string,
  eventId: string,
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");

  const member = await requireFamilyAccess(
    familyId,
    session.user.id,
    "contributor",
  );

  const event = await getEvent(eventId, familyId);
  if (!event) return;
  if (
    !canDelete(
      { userId: session.user.id, role: member.role },
      { privacyLevel: event.privacyLevel, createdBy: event.createdBy ?? "" },
    )
  ) {
    throw new ForbiddenError("У вас нет прав на удаление этого события.");
  }

  await removeEvent(eventId, familyId);
  const familySlug = await getFamilySlugById(familyId);
  const personSlug = await getPersonSlugById(personId, familyId);
  revalidatePath(`/families/${familySlug}/people/${personSlug}`);
}
