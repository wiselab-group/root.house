import { isSyntheticEventId } from "@/domain/event/event.service";
import type {
  EventRecord,
  EventParticipantWithName,
  TimelineEvent,
} from "@/domain/event/event.service";
import type { EventWording } from "./event-wording";
import type { PlaceRecord } from "@/domain/place/place.service";
import type { PartnershipRecord } from "@/domain/relationship/relationship.repository";
import type { PartialDate } from "@/domain/shared/partial-date";

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
    }
  | {
      /** The synthetic «Свадьба» — edited in an EditPanel (wedding date +
       *  still-ongoing), see MarriageEditForm. */
      kind: "marriage-edit";
      familyId: string;
      personId: string;
      otherPersonId: string;
      relationshipId: string;
      startDate: PartialDate | null;
      endDate: PartialDate | null;
      isCurrent: boolean;
      status: PartnershipRecord["status"];
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
 * birth/death to the profile form, scrolled to that block; a marriage to a
 * «Свадьба» EditPanel with its date AND whether it's still ongoing. (A
 * date-only dialog was removed on user request 2026-09-26 — the card shows
 * more than a date; then a «#family» link replaced it, but its controls
 * were hover-only icons on the spouse row, so the user found nothing to
 * edit there — reported 2026-09-27.)
 */
export function timelineRowTargetFor({
  event,
  familyId,
  familySlug,
  personId,
  personSlug,
  canEdit,
  partnerships,
  eventEditDataById,
  wording,
}: {
  event: TimelineEvent;
  familyId: string;
  familySlug: string;
  personId: string;
  personSlug: string;
  canEdit: boolean;
  /** The person's partnerships — the «Свадьба» rows are derived from them. */
  partnerships: PartnershipRecord[];
  /** Only populated for real events this member may edit (see
   *  resolveEventEditData). A real event this member can only view has no
   *  entry here and falls back to `link` (the read-only details page). */
  eventEditDataById: Map<
    string,
    { participants: EventParticipantWithName[]; places: PlaceRecord[] }
  >;
  wording: EventWording;
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
      label: wording.t("profileOf", { name: event.relatedPerson.firstName }),
    };
  }
  if (!canEdit) return { kind: "none" };

  if (event.type === "birth" || event.type === "death") {
    return {
      kind: "link",
      href: `/families/${familySlug}/people/${personSlug}/edit#${event.type}`,
      label: wording.t("edit"),
      intent: "edit",
    };
  }
  if (event.type === "marriage") {
    const partnership = partnerships.find(
      (item) => event.id === `synthetic:marriage:${item.id}`,
    );
    if (partnership) {
      return {
        kind: "marriage-edit",
        familyId,
        personId,
        otherPersonId:
          partnership.person1Id === personId
            ? partnership.person2Id
            : partnership.person1Id,
        relationshipId: partnership.id,
        startDate: partnership.startDate,
        endDate: partnership.endDate,
        isCurrent: partnership.isCurrent,
        status: partnership.status,
      };
    }
    return {
      kind: "link",
      href: "#family",
      label: wording.t("edit"),
      intent: "edit",
    };
  }
  return { kind: "none" };
}
