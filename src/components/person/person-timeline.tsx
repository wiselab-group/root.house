import {
  getPersonTimeline,
  filterVisibleEvents,
} from "@/domain/event/event.service";
import { listPlaces } from "@/domain/place/place.service";
import { getPartnershipsOf } from "@/domain/relationship/relationship.repository";
import { AddEventForm } from "@/components/forms/add-event-form";
import { CollapsibleForm } from "@/components/forms/collapsible-form";
import { TimelineListItem } from "./timeline-list-item";
import { timelineRowTargetFor } from "./timeline-target";
import { resolveOtherPersonNames, resolveEventEditData } from "./timeline-data";
import { ProfileSection } from "./profile-section";
import type { ActingMember } from "@/domain/family/permissions";

/**
 * A Person's chronological timeline of events — server component, fetches
 * its own data so the Person Profile page doesn't have to orchestrate it
 * (same pattern as PersonFamilyPanel).
 *
 * Renders as a plain static list with a neutral connector rail — not a
 * step/progress component. A person's life events are settled fact, not a
 * roadmap with a "current step"; an earlier version used a shadcn/reui
 * roadmap-timeline primitive (step/activeStep/data-completed semantics)
 * forced into an all-"completed" state to fake this look, which both
 * misused --primary (terracotta, reserved for actions/selection — see
 * CLAUDE.md's DESIGN TOKENS) as permanent idle decoration and read as an
 * incongruously upbeat "all steps done!" visual next to entries like
 * Смерть/Война/Заключение. Reverted per /impeccable critique findings.
 * Row-target resolution lives in timeline-target.ts, its supporting
 * queries in timeline-data.ts, row rendering in
 * timeline-list-item.tsx/timeline-row.tsx — split out to stay under the
 * 150-line component guideline once every row became clickable.
 */
export async function PersonTimeline({
  familyId,
  familySlug,
  personId,
  canEdit,
  canContribute = canEdit,
  member,
}: {
  familyId: string;
  familySlug: string;
  personId: string;
  canEdit: boolean;
  /** May add Events — owner/editor/contributor. Defaults to canEdit for any
   *  caller not yet passing this explicitly. */
  canContribute?: boolean;
  member: ActingMember;
}) {
  const [allTimeline, places, partnerships] = await Promise.all([
    getPersonTimeline(personId, familyId),
    listPlaces(familyId),
    getPartnershipsOf(personId, familyId),
  ]);
  const timeline = filterVisibleEvents(allTimeline, member);
  const placeNameById = new Map(places.map((place) => [place.id, place.name]));
  const partnershipById = new Map(
    partnerships.map((partnership) => [partnership.id, partnership]),
  );

  const [otherPersonNameByPartnershipId, eventEditDataById] = await Promise.all(
    [
      resolveOtherPersonNames({
        timeline,
        partnerships,
        personId,
        familyId,
        canEdit,
      }),
      resolveEventEditData({ timeline, member, familyId, places }),
    ],
  );

  return (
    <ProfileSection id="timeline" title="Хронология" count={timeline.length}>
      <div className="flex flex-col gap-4">
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">Событий пока нет.</p>
        ) : (
          <ol className="flex flex-col">
            {timeline.map((event, index) => (
              <TimelineListItem
                key={event.id}
                event={event}
                isLast={index === timeline.length - 1}
                placeName={
                  event.placeId ? placeNameById.get(event.placeId) : undefined
                }
                target={timelineRowTargetFor({
                  event,
                  familyId,
                  familySlug,
                  personId,
                  canEdit,
                  partnershipById,
                  otherPersonNameByPartnershipId,
                  eventEditDataById,
                })}
              />
            ))}
          </ol>
        )}

        {canContribute && (
          <CollapsibleForm triggerLabel="Добавить событие">
            <AddEventForm
              familyId={familyId}
              personId={personId}
              places={places}
            />
          </CollapsibleForm>
        )}
      </div>
    </ProfileSection>
  );
}
