import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import {
  getEvent,
  getParticipantsWithNames,
} from "@/domain/event/event.service";
import { getPlace } from "@/domain/place/place.service";
import { EVENT_TYPE_LABELS } from "@/domain/event/event-roles";
import { formatPartialDate } from "@/domain/shared/partial-date";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { getFamilySummary } from "@/domain/family/family.service";

export default async function EventDetailsPage({
  params,
}: PageProps<"/families/[slug]/events/[eventId]">) {
  const { slug, eventId } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  await requireFamilyAccess(familyId, session.user.id, "viewer");
  const event = await getEvent(eventId, familyId);
  if (!event) notFound();

  const [participants, place, family] = await Promise.all([
    getParticipantsWithNames(eventId, familyId),
    event.placeId ? getPlace(event.placeId, familyId) : null,
    getFamilySummary(familyId),
  ]);

  // Prefer a trail back through the event's primary subject (usually the
  // Person whose timeline this was opened from) over the bare "Люди" list —
  // more useful than a fallback that drops the context entirely.
  const subject = participants[0];
  const breadcrumbItems = [
    { label: "Мои семьи", href: "/families" },
    { label: family?.name ?? slug, href: `/families/${slug}` },
    ...(subject?.slug
      ? [
          {
            label: subject.name,
            href: `/families/${slug}/people/${subject.slug}`,
          },
        ]
      : [{ label: "Люди", href: `/families/${slug}/people` }]),
    { label: event.title },
  ];

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <SetBreadcrumbs items={breadcrumbItems} />
      <div>
        <Badge variant="secondary">{EVENT_TYPE_LABELS[event.type]}</Badge>
        <h1 className="font-heading mt-2 text-3xl font-medium">
          {event.title}
        </h1>
        <p className="text-muted-foreground">
          {formatPartialDate(event.date)}
          {event.endDate && ` — ${formatPartialDate(event.endDate)}`}
          {place && ` · ${place.name}`}
        </p>
      </div>

      {event.description && (
        <Card>
          <CardHeader>
            <CardTitle>Описание</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">
            {event.description}
          </CardContent>
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
                <li
                  key={p.personId}
                  className="flex items-center justify-between text-sm"
                >
                  {p.slug ? (
                    <Link
                      href={`/families/${slug}/people/${p.slug}`}
                      className="hover:underline"
                    >
                      {p.name}
                    </Link>
                  ) : (
                    <span>{p.name}</span>
                  )}
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
