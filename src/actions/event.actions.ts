"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { ForbiddenError } from "@/domain/family/errors";
import { canCreate, canDelete, canEdit } from "@/domain/family/permissions";
import { getFamilySlugById } from "@/domain/family/family.service";
import { getPersonSlugById } from "@/domain/person/person.service";
import { createEventSchema } from "@/lib/validation/event";
import {
  addEvent,
  editEvent,
  getEvent,
  removeEvent,
} from "@/domain/event/event.service";
import { partialDateFromFormData } from "@/domain/shared/partial-date";
import { resolvePlaceFields, revalidatePlacePages } from "@/lib/place-choice";

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
    privacyLevel: formData.get("privacyLevel") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  const places = await resolvePlaceFields(familyId, formData, ["placeId"]);
  await addEvent({
    familyId,
    createdBy: session.user.id,
    type: parsed.data.type,
    title: parsed.data.title,
    description: parsed.data.description || undefined,
    date: partialDateFromFormData(formData, "date"),
    endDate: partialDateFromFormData(formData, "endDate"),
    placeId: places.ids.placeId ?? undefined,
    privacyLevel: parsed.data.privacyLevel,
    participants: [{ personId, role: "subject" }],
  });

  const familySlug = await getFamilySlugById(familyId);
  const personSlug = await getPersonSlugById(personId, familyId);
  revalidatePath(`/families/${familySlug}/people/${personSlug}`);
  if (places.createdAny) revalidatePlacePages(familySlug);
  return {};
}

export async function deleteEventAction(
  familyId: string,
  personId: string,
  eventId: string,
): Promise<void> {
  // Pseudo-events (birth/death/marriage) are never real `events` rows — see
  // event.service.ts::synthesizeDerivedEvents — so there's nothing to delete.
  if (eventId.startsWith("synthetic:")) return;

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

  await removeEvent(eventId, familyId, session.user.id);
  const familySlug = await getFamilySlugById(familyId);
  const personSlug = await getPersonSlugById(personId, familyId);
  revalidatePath(`/families/${familySlug}/people/${personSlug}`);
  redirect(`/families/${familySlug}/people/${personSlug}`);
}

/**
 * Edits an Event's fields and, via participantPersonId/participantRole
 * (repeated form fields, matched by index — see EventParticipantsField),
 * replaces its full participant list. Mirrors updatePersonAction's
 * auth → canEdit → parse → call → redirect shape.
 *
 * `redirectTo` is bound by the caller: the standalone /events/[id]/edit
 * page binds the event's own details URL (same full-page navigation as
 * before); TimelineRow's in-place edit dialog (opened from a Person's
 * profile, not the event's own page) binds `null` so a save just closes
 * the dialog and revalidates the current page instead of navigating away.
 */
export async function updateEventAction(
  familyId: string,
  eventId: string,
  redirectTo: string | null,
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

  const existing = await getEvent(eventId, familyId);
  if (!existing) return { error: "Событие не найдено." };
  if (
    !canEdit(
      { userId: session.user.id, role: member.role },
      {
        privacyLevel: existing.privacyLevel,
        createdBy: existing.createdBy ?? "",
      },
    )
  ) {
    return { error: "У вас нет прав на редактирование этого события." };
  }

  const parsed = createEventSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    description: formData.get("description"),
    privacyLevel: formData.get("privacyLevel") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { fieldErrors };
  }

  const participantIds = formData.getAll("participantPersonId");
  const participantRoles = formData.getAll("participantRole");
  const participants = participantIds.map((id, i) => ({
    personId: String(id),
    role: String(participantRoles[i] ?? "participant"),
  }));

  const places = await resolvePlaceFields(familyId, formData, ["placeId"]);
  const updated = await editEvent(eventId, familyId, session.user.id, {
    type: parsed.data.type,
    title: parsed.data.title,
    description: parsed.data.description || null,
    date: partialDateFromFormData(formData, "date") ?? null,
    endDate: partialDateFromFormData(formData, "endDate") ?? null,
    placeId: places.ids.placeId,
    privacyLevel: parsed.data.privacyLevel,
    participants,
  });

  if (!updated) return { error: "Событие не найдено." };

  const familySlug = await getFamilySlugById(familyId);
  if (places.createdAny) revalidatePlacePages(familySlug);
  if (redirectTo === null) {
    // subject is this event's own primary participant — the Person
    // profile page a Хронология dialog was opened from.
    const subjectPersonId = participants[0]?.personId;
    if (subjectPersonId) {
      const personSlug = await getPersonSlugById(subjectPersonId, familyId);
      revalidatePath(`/families/${familySlug}/people/${personSlug}`);
    }
    return {};
  }
  revalidatePath(`/families/${familySlug}/events/${eventId}`);
  redirect(redirectTo);
}
