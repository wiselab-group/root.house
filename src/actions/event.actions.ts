"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getFamilySlugById } from "@/domain/family/family.service";
import { createEventSchema } from "@/lib/validation/event";
import { addEvent, removeEvent } from "@/domain/event/event.service";
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

  await requireFamilyAccess(familyId, session.user.id, "editor");

  const parsed = createEventSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    description: formData.get("description"),
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
    participants: [{ personId, role: "subject" }],
  });

  const slug = await getFamilySlugById(familyId);
  revalidatePath(`/families/${slug}/people/${personId}`);
  return {};
}

export async function deleteEventAction(familyId: string, personId: string, eventId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Сессия истекла — войдите заново.");

  await requireFamilyAccess(familyId, session.user.id, "editor");
  await removeEvent(eventId, familyId);
  const slug = await getFamilySlugById(familyId);
  revalidatePath(`/families/${slug}/people/${personId}`);
}
