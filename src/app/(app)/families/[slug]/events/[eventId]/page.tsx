import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import {
  getVisibleEvent,
  getParticipantsWithNames,
} from "@/domain/event/event.service";
import { getPlace } from "@/domain/place/place.service";
import { EVENT_TYPE_LABELS } from "@/domain/event/event-roles";
import { formatPartialDate } from "@/domain/shared/partial-date";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { Badge } from "@/components/ui/badge";
import { ProfileSection } from "@/components/person/profile-section";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { getFamilySummary } from "@/domain/family/family.service";

export async function generateMetadata({
  params,
}: PageProps<"/families/[slug]/events/[eventId]">): Promise<Metadata> {
  const { slug, eventId } = await params;
  const session = await auth();
  if (!session?.user) return {};

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  const event = await getVisibleEvent(eventId, familyId, {
    userId: session.user.id,
    role: member.role,
  });
  if (!event) notFound();
  return { title: event.title };
}

export default async function EventDetailsPage({
  params,
}: PageProps<"/families/[slug]/events/[eventId]">) {
  const { slug, eventId } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  const event = await getVisibleEvent(eventId, familyId, {
    userId: session.user.id,
    role: member.role,
  });
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
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12 sm:py-16">
      <SetBreadcrumbs items={breadcrumbItems} />
      <div className="flex flex-col gap-2">
        <Badge variant="secondary" className="w-fit">
          {EVENT_TYPE_LABELS[event.type]}
        </Badge>
        <h1 className="font-heading text-3xl font-medium tracking-tight text-balance">
          {event.title}
        </h1>
        <p className="text-muted-foreground">
          {formatPartialDate(event.date)}
          {event.endDate && ` — ${formatPartialDate(event.endDate)}`}
          {place && ` · ${place.name}`}
        </p>
      </div>

      {event.description && (
        <ProfileSection title="Описание">
          <p className="text-sm whitespace-pre-wrap">{event.description}</p>
        </ProfileSection>
      )}

      <ProfileSection title="Участники">
        {participants.length === 0 ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {participants.map((p) => (
              <li
                key={p.personId}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                {p.slug ? (
                  <Link
                    href={`/families/${slug}/people/${p.slug}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {p.name}
                  </Link>
                ) : (
                  <span className="font-medium">{p.name}</span>
                )}
                <span className="text-sm text-muted-foreground">
                  {p.roleLabel}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ProfileSection>
    </main>
  );
}
