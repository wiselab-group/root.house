import Link from "next/link";
import { getPersonTimeline } from "@/domain/event/event.service";
import { listPlaces } from "@/domain/place/place.service";
import { EVENT_TYPE_LABELS } from "@/domain/event/event-roles";
import { formatPartialDate } from "@/domain/shared/partial-date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddEventForm } from "@/components/forms/add-event-form";
import { CollapsibleForm } from "@/components/forms/collapsible-form";

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
}: {
  familyId: string;
  familySlug: string;
  personId: string;
  canEdit: boolean;
}) {
  const [timeline, places] = await Promise.all([
    getPersonTimeline(personId, familyId),
    listPlaces(familyId),
  ]);
  const placeNameById = new Map(places.map((place) => [place.id, place.name]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Хронология</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">Событий пока нет.</p>
        ) : (
          <ol className="flex flex-col gap-3 border-l border-border pl-4">
            {timeline.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/families/${familySlug}/events/${event.id}`}
                  className="flex flex-col gap-0.5 hover:opacity-80"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{EVENT_TYPE_LABELS[event.type]}</Badge>
                    <span className="text-xs text-muted-foreground">{formatPartialDate(event.date)}</span>
                  </div>
                  <span className="text-sm font-medium">{event.title}</span>
                  {event.placeId && placeNameById.has(event.placeId) && (
                    <span className="text-xs text-muted-foreground">
                      {placeNameById.get(event.placeId)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        )}

        {canEdit && (
          <CollapsibleForm triggerLabel="Добавить событие">
            <AddEventForm familyId={familyId} personId={personId} places={places} />
          </CollapsibleForm>
        )}
      </CardContent>
    </Card>
  );
}
