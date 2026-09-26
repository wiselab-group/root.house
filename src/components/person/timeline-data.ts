import {
  getParticipantsWithNames,
  isSyntheticEventId,
  type EventRecord,
  type EventParticipantWithName,
} from "@/domain/event/event.service";
import {
  canEdit as canEditObject,
  type ActingMember,
} from "@/domain/family/permissions";
import type { PartnershipRecord } from "@/domain/relationship/relationship.repository";
import type { PlaceRecord } from "@/domain/place/place.service";
import type { TimelineEvent } from "@/domain/event/event.service";
import { resolveTimelineFacts } from "./timeline-facts";

/**
 * Data-loading helpers for PersonTimeline — split out to keep the
 * component itself under the project's 150-line guideline. Each resolves
 * only what's actually needed for the given timeline (no real event this
 * member can edit → no participants queries).
 */

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

/** Everything PersonTimeline resolves beyond the timeline itself, in one
 *  parallel round — the Линия жизни card's facts only when it's drawn. */
export async function resolveTimelineExtras({
  timeline,
  partnerships,
  places,
  personId,
  familyId,
  member,
  withFacts,
}: {
  timeline: TimelineEvent[];
  partnerships: PartnershipRecord[];
  places: PlaceRecord[];
  personId: string;
  familyId: string;
  member: ActingMember;
  withFacts: boolean;
}) {
  const [eventEditDataById, factsById] = await Promise.all([
    resolveEventEditData({ timeline, member, familyId, places }),
    withFacts
      ? resolveTimelineFacts({
          timeline,
          personId,
          familyId,
          partnerships,
          member,
        })
      : new Map<string, string[]>(),
  ]);
  return { eventEditDataById, factsById };
}
