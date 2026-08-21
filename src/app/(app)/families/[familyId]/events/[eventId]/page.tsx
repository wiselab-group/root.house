import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getEvent, getParticipantsWithNames } from "@/domain/event/event.service";
import { EVENT_TYPE_LABELS } from "@/domain/event/event-roles";
import { formatPartialDate } from "@/domain/shared/partial-date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function EventDetailsPage({
  params,
}: PageProps<"/families/[familyId]/events/[eventId]">) {
  const { familyId, eventId } = await params;
  const session = await auth();
  if (!session?.user) return null;

  await requireFamilyAccess(familyId, session.user.id, "viewer");
  const event = await getEvent(eventId, familyId);
  if (!event) notFound();

  const participants = await getParticipantsWithNames(eventId, familyId);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <Badge variant="secondary">{EVENT_TYPE_LABELS[event.type]}</Badge>
        <h1 className="mt-2 text-3xl font-semibold">{event.title}</h1>
        <p className="text-muted-foreground">
          {formatPartialDate(event.date)}
          {event.endDate && ` — ${formatPartialDate(event.endDate)}`}
        </p>
      </div>

      {event.description && (
        <Card>
          <CardHeader>
            <CardTitle>Описание</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{event.description}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Участники</CardTitle>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {participants.map((p) => (
                <li key={p.personId} className="flex items-center justify-between text-sm">
                  <Link href={`/families/${familyId}/people/${p.personId}`} className="hover:underline">
                    {p.name}
                  </Link>
                  <span className="text-muted-foreground">{p.roleLabel}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
