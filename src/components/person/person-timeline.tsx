import Link from "next/link";
import {
  getPersonTimeline,
  filterVisibleEvents,
  isSyntheticEventId,
} from "@/domain/event/event.service";
import { listPlaces } from "@/domain/place/place.service";
import { EVENT_TYPE_LABELS } from "@/domain/event/event-roles";
import { formatPartialDate } from "@/domain/shared/partial-date";
import { Badge } from "@/components/ui/badge";
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline";
import { AddEventForm } from "@/components/forms/add-event-form";
import { CollapsibleForm } from "@/components/forms/collapsible-form";
import { ProfileSection } from "./profile-section";
import type { ActingMember } from "@/domain/family/permissions";

/**
 * A Person's chronological timeline of events — server component, fetches
 * its own data so the Person Profile page doesn't have to orchestrate it
 * (same pattern as PersonFamilyPanel).
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
  const [allTimeline, places] = await Promise.all([
    getPersonTimeline(personId, familyId),
    listPlaces(familyId),
  ]);
  const timeline = filterVisibleEvents(allTimeline, member);
  const placeNameById = new Map(places.map((place) => [place.id, place.name]));

  return (
    <ProfileSection id="timeline" title="Хронология" count={timeline.length}>
      <div className="flex flex-col gap-4">
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">Событий пока нет.</p>
        ) : (
          <Timeline defaultValue={timeline.length}>
            {timeline.map((event, index) => {
              const title = (
                <span className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {EVENT_TYPE_LABELS[event.type]}
                  </Badge>
                  <span className="text-sm font-medium">{event.title}</span>
                </span>
              );

              return (
                <TimelineItem key={event.id} step={index + 1}>
                  <TimelineHeader>
                    <TimelineSeparator />
                    <TimelineIndicator />
                    <TimelineDate>{formatPartialDate(event.date)}</TimelineDate>
                    {isSyntheticEventId(event.id) ? (
                      <TimelineTitle>{title}</TimelineTitle>
                    ) : (
                      <TimelineTitle
                        render={
                          <Link
                            href={`/families/${familySlug}/events/${event.id}`}
                            className="hover:opacity-80"
                          />
                        }
                      >
                        {title}
                      </TimelineTitle>
                    )}
                  </TimelineHeader>
                  {event.placeId && placeNameById.has(event.placeId) && (
                    <TimelineContent>
                      {placeNameById.get(event.placeId)}
                    </TimelineContent>
                  )}
                </TimelineItem>
              );
            })}
          </Timeline>
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
