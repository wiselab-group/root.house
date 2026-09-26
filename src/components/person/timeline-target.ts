import { isSyntheticEventId } from "@/domain/event/event.service";
import type {
  EventRecord,
  EventParticipantWithName,
  TimelineEvent,
} from "@/domain/event/event.service";
import type { PlaceRecord } from "@/domain/place/place.service";

/**
 * Where a timeline row's interaction goes — resolved server-side (see
 * timelineRowTargetFor below), then rendered by the client TimelineRow
 * component since the edit dialog needs client state a Server Component
 * can't own itself. Lives in this plain-TS module (no "use client") rather
 * than timeline-row.tsx so timeline-list-item.tsx — a Server Component —
 * can call isTimelineRowInteractive without pulling in client-only code.
 */
export type TimelineRowTarget =
  | { kind: "none" }
  | {
      kind: "link";
      /** A path, or a same-page «#anchor» (the profile's «Семья»). */
      href: string;
      /** Action wording in the Линия жизни card; «Подробнее» when absent. */
      label?: string;
      /** «edit» — the link leads to where this entry is edited (pencil
       *  icon), not to read more about it (arrow). */
      intent?: "edit";
    }
  | {
      kind: "event-edit-dialog";
      familyId: string;
      event: EventRecord;
      participants: EventParticipantWithName[];
      places: PlaceRecord[];
    };

export function isTimelineRowInteractive(target: TimelineRowTarget): boolean {
  return target.kind !== "none";
}

/**
 * Resolves what a timeline row should do on click/tap — split out of
 * PersonTimeline to keep it under the project's 150-line component
 * guideline. Pure data-in/data-out (no fetching).
 *
 * Synthetic rows have no `events` row of their own, so they lead to where
 * the record they're derived from is edited — and where every fact the card
 * shows (place, cause, parents) can be fixed, not just the date:
 * birth/death to the profile form, scrolled to that block; a marriage to
 * the profile's own «Семья» list (spouse pills, where partnership dates
 * and status live). A narrow date-only dialog used to sit here and was
 * removed on user request 2026-09-26: the card now shows more than a date,
 * and a button that could only fix the date misled.
 */
export function timelineRowTargetFor({
  event,
  familyId,
  familySlug,
  personSlug,
  canEdit,
  eventEditDataById,
}: {
  event: TimelineEvent;
  familyId: string;
  familySlug: string;
  personSlug: string;
  canEdit: boolean;
  /** Only populated for real events this member may edit (see
   *  resolveEventEditData). A real event this member can only view has no
   *  entry here and falls back to `link` (the read-only details page). */
  eventEditDataById: Map<
    string,
    { participants: EventParticipantWithName[]; places: PlaceRecord[] }
  >;
}): TimelineRowTarget {
  if (!isSyntheticEventId(event.id)) {
    const editData = eventEditDataById.get(event.id);
    if (editData) {
      return {
        kind: "event-edit-dialog",
        familyId,
        event,
        participants: editData.participants,
        places: editData.places,
      };
    }
    return { kind: "link", href: `/families/${familySlug}/events/${event.id}` };
  }
  // A child's birth is the child's own record — edited on their profile,
  // not here, so it only ever links there (for editors and viewers alike).
  if (event.relatedPerson) {
    return {
      kind: "link",
      href: `/families/${familySlug}/people/${event.relatedPerson.slug}`,
      label: `Профиль: ${event.relatedPerson.firstName}`,
    };
  }
  if (!canEdit) return { kind: "none" };

  if (event.type === "birth" || event.type === "death") {
    return {
      kind: "link",
      href: `/families/${familySlug}/people/${personSlug}/edit#${event.type}`,
      label: "Редактировать",
      intent: "edit",
    };
  }
  if (event.type === "marriage") {
    return {
      kind: "link",
      href: "#family",
      label: "Редактировать",
      intent: "edit",
    };
  }
  return { kind: "none" };
}
