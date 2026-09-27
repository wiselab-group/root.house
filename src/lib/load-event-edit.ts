import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { canEdit } from "@/domain/family/permissions";
import {
  getVisibleEvent,
  getParticipantsWithNames,
} from "@/domain/event/event.service";
import { listPlaces } from "@/domain/place/place.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import type { Locale } from "@/domain/shared/locale";

/**
 * Everything the event edit form needs, shared by the standalone
 * /events/[id]/edit page and the EditPanel over the event page
 * (@modal/(.)edit): contributor floor, then canEdit on the event itself —
 * an event the viewer may not edit is a 404 in both, never a form.
 * Returns null without a session (the (app) layout redirects to login).
 */
export async function loadEventEdit(
  slug: string,
  eventId: string,
  locale: Locale,
) {
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(
    familyId,
    session.user.id,
    "contributor",
  );
  const viewer = { userId: session.user.id, role: member.role };
  const event = await getVisibleEvent(eventId, familyId, viewer);
  if (!event) notFound();
  if (
    !canEdit(viewer, {
      privacyLevel: event.privacyLevel,
      createdBy: event.createdBy ?? "",
    })
  ) {
    notFound();
  }

  const [participants, places] = await Promise.all([
    getParticipantsWithNames(eventId, familyId, locale),
    listPlaces(familyId),
  ]);
  return { familyId, event, participants, places };
}
