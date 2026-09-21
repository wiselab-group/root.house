import { isSyntheticEventId } from "@/domain/event/event.service";
import type {
  EventRecord,
  EventParticipantWithName,
} from "@/domain/event/event.service";
import type { PartnershipRecord } from "@/domain/relationship/relationship.repository";
import type { PlaceRecord } from "@/domain/place/place.service";
import type { PartialDate } from "@/domain/shared/partial-date";

/**
 * Where a timeline row's interaction goes — resolved server-side (see
 * timelineRowTargetFor below), then rendered by the client TimelineRow
 * component since two of the three kinds need client interactivity
 * (Dialog state) that a Server Component can't own itself. Lives in this
 * plain-TS module (no "use client") rather than timeline-row.tsx so
 * timeline-list-item.tsx — a Server Component — can call
 * isTimelineRowInteractive without pulling in client-only code.
 */
export type TimelineRowTarget =
  | { kind: "none" }
  | { kind: "link"; href: string }
  | {
      kind: "marriage-dialog";
      familyId: string;
      personId: string;
      otherPersonId: string;
      relationshipId: string;
      startDate: PartialDate | null;
      otherPersonName: string;
    }
  | {
      kind: "person-date-dialog";
      familyId: string;
      personId: string;
      field: "birthDate" | "deathDate";
      date: PartialDate | null;
      label: string;
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
 * guideline. Pure data-in/data-out (no fetching): PersonTimeline resolves
 * the other spouse's display name up front (one query per partnership,
 * not per event) and hands in ready-to-use maps.
 *
 * Synthetic birth/death/marriage rows (see synthesizeDerivedEvents) have
 * no `events` row of their own to link to — birth/death open a date-only
 * edit dialog on the Person itself (the field that actually produced the
 * row), marriage opens the same date-edit dialog as the spouse pill in
 * PersonFamilyPanel (see PartnershipDateEditButton). Both require canEdit,
 * same as those existing affordances.
 */
export function timelineRowTargetFor({
  event,
  familyId,
  familySlug,
  personId,
  canEdit,
  partnershipById,
  otherPersonNameByPartnershipId,
  eventEditDataById,
}: {
  event: EventRecord;
  familyId: string;
  familySlug: string;
  personId: string;
  canEdit: boolean;
  partnershipById: Map<string, PartnershipRecord>;
  otherPersonNameByPartnershipId: Map<string, string>;
  /** Only populated for real events this member may edit (see
   *  PersonTimeline — one canEdit(member, event) + participants query per
   *  editable event). A real event this member can only view (owner/editor-
   *  only content, viewer role, or another member's own contribution) has
   *  no entry here and falls back to `link` (the read-only details page). */
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
  if (!canEdit) return { kind: "none" };

  if (event.type === "birth" || event.type === "death") {
    return {
      kind: "person-date-dialog",
      familyId,
      personId,
      field: event.type === "birth" ? "birthDate" : "deathDate",
      date: event.date,
      label: event.type === "birth" ? "Дата рождения" : "Дата смерти",
    };
  }

  if (event.type === "marriage") {
    // id shape: `synthetic:marriage:${partnership.id}` — see
    // synthesizeDerivedEvents in event.service.ts.
    const partnershipId = event.id.split(":")[2];
    const partnership = partnershipById.get(partnershipId);
    const otherPersonName = otherPersonNameByPartnershipId.get(partnershipId);
    if (!partnership || !otherPersonName) return { kind: "none" };
    const otherPersonId =
      partnership.person1Id === personId
        ? partnership.person2Id
        : partnership.person1Id;
    return {
      kind: "marriage-dialog",
      familyId,
      personId,
      otherPersonId,
      relationshipId: partnership.id,
      startDate: partnership.startDate,
      otherPersonName,
    };
  }

  return { kind: "none" };
}
