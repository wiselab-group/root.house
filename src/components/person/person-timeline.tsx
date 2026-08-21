import Link from "next/link";
import { getPersonTimeline } from "@/domain/event/event.service";
import { EVENT_TYPE_LABELS } from "@/domain/event/event-roles";
import { formatPartialDate } from "@/domain/shared/partial-date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddEventForm } from "@/components/forms/add-event-form";

/**
 * A Person's chronological timeline of events — server component, fetches
 * its own data so the Person Profile page doesn't have to orchestrate it
 * (same pattern as PersonFamilyPanel).
 */
export async function PersonTimeline({
  familyId,
  personId,
  canEdit,
}: {
  familyId: string;
  personId: string;
  canEdit: boolean;
}) {
  const timeline = await getPersonTimeline(personId, familyId);

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
                  href={`/families/${familyId}/events/${event.id}`}
                  className="flex flex-col gap-0.5 hover:opacity-80"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{EVENT_TYPE_LABELS[event.type]}</Badge>
                    <span className="text-xs text-muted-foreground">{formatPartialDate(event.date)}</span>
                  </div>
                  <span className="text-sm font-medium">{event.title}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}

        {canEdit && <AddEventForm familyId={familyId} personId={personId} />}
      </CardContent>
    </Card>
  );
}
