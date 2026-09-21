import {
  getParticipantsWithNames,
  isSyntheticEventId,
  type EventRecord,
  type EventParticipantWithName,
} from "@/domain/event/event.service";
import { getPersonById } from "@/domain/person/person.repository";
import { personDisplayName } from "@/domain/person/display-name";
import {
  canEdit as canEditObject,
  type ActingMember,
} from "@/domain/family/permissions";
import type { PartnershipRecord } from "@/domain/relationship/relationship.repository";
import type { PlaceRecord } from "@/domain/place/place.service";

/**
 * Data-loading helpers for PersonTimeline — split out to keep the
 * component itself under the project's 150-line guideline. Both resolve
 * only what's actually needed for the given timeline (no marriage event →
 * no spouse-name queries; no real event this member can edit → no
 * participants queries), not the full partnerships/events list
 * unconditionally.
 */

/** One query per partnership (not per event) — skipped entirely when the
 *  timeline has no synthetic marriage row or the caller can't edit it. */
export async function resolveOtherPersonNames({
  timeline,
  partnerships,
  personId,
  familyId,
  canEdit,
}: {
  timeline: EventRecord[];
  partnerships: PartnershipRecord[];
  personId: string;
  familyId: string;
  canEdit: boolean;
}): Promise<Map<string, string>> {
  const otherPersonNameByPartnershipId = new Map<string, string>();
  const hasMarriageEvent = timeline.some((event) => event.type === "marriage");
  if (!canEdit || !hasMarriageEvent) return otherPersonNameByPartnershipId;

  await Promise.all(
    partnerships.map(async (partnership) => {
      const otherPersonId =
        partnership.person1Id === personId
          ? partnership.person2Id
          : partnership.person1Id;
      const otherPerson = await getPersonById(otherPersonId, familyId);
      if (otherPerson) {
        otherPersonNameByPartnershipId.set(
          partnership.id,
          personDisplayName(otherPerson),
        );
      }
    }),
  );
  return otherPersonNameByPartnershipId;
}

export interface EventEditData {
  participants: EventParticipantWithName[];
  places: PlaceRecord[];
}

/** One query per real event this member may edit — same per-object rule
 *  updateEventAction enforces server-side, checked here up front so a row
 *  without edit rights falls back to the read-only details link instead
 *  of opening a dialog that would just error out on submit. */
export async function resolveEventEditData({
  timeline,
  member,
  familyId,
  places,
}: {
  timeline: EventRecord[];
  member: ActingMember;
  familyId: string;
  places: PlaceRecord[];
}): Promise<Map<string, EventEditData>> {
  const eventEditDataById = new Map<string, EventEditData>();
  await Promise.all(
    timeline
      .filter(
        (event) =>
          !isSyntheticEventId(event.id) &&
          canEditObject(member, {
            privacyLevel: event.privacyLevel,
            createdBy: event.createdBy ?? "",
          }),
      )
      .map(async (event) => {
        const participants = await getParticipantsWithNames(event.id, familyId);
        eventEditDataById.set(event.id, { participants, places });
      }),
  );
  return eventEditDataById;
}
