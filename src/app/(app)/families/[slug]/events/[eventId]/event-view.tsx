import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { canDelete, canEdit } from "@/domain/family/permissions";
import {
  getVisibleEvent,
  getParticipantsWithNames,
} from "@/domain/event/event.service";
import { getPlace } from "@/domain/place/place.service";
import { formatPartialDate } from "@/domain/shared/partial-date";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { ProfileSection } from "@/components/person/profile-section";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { getFamilySummary } from "@/domain/family/family.service";
import { getEventWording } from "@/components/person/event-wording";
import { DeleteEventButton } from "@/components/event/delete-event-button";

/**
 * The event page itself — rendered by page.tsx, and by edit/page.tsx under
 * the EditPanel on a hard load of /…/edit, same as people/[personSlug]'s
 * PersonProfileView.
 */
export async function EventView({
  slug,
  eventId,
}: {
  slug: string;
  eventId: string;
}) {
  const locale = await getLocale();
  const t = await getTranslations();
  const wording = await getEventWording();
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
    getParticipantsWithNames(eventId, familyId, locale),
    event.placeId ? getPlace(event.placeId, familyId) : null,
    getFamilySummary(familyId),
  ]);

  // Prefer a trail back through the event's primary subject (usually the
  // Person whose timeline this was opened from) over the bare "Люди" list —
  // more useful than a fallback that drops the context entirely.
  const subject = participants[0];

  const actingMember = { userId: session.user.id, role: member.role };
  const ownership = {
    privacyLevel: event.privacyLevel,
    createdBy: event.createdBy ?? "",
  };
  const showEdit = canEdit(actingMember, ownership);
  const showDelete = canDelete(actingMember, ownership);
  const breadcrumbItems = [
    { label: t("families.title"), href: "/families" },
    { label: family?.name ?? slug, href: `/families/${slug}` },
    ...(subject?.slug
      ? [
          {
            label: subject.name,
            href: `/families/${slug}/people/${subject.slug}`,
          },
        ]
      : [{ label: t("familyNav.people"), href: `/families/${slug}/people` }]),
    { label: event.title },
  ];

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12 sm:py-16">
      <SetBreadcrumbs items={breadcrumbItems} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <Badge variant="secondary" className="w-fit">
            {t(`eventTypes.${event.type}`)}
          </Badge>
          <h1 className="font-heading text-title font-medium tracking-tight text-balance">
            {event.title}
          </h1>
          <p className="text-muted-foreground">
            {formatPartialDate(event.date, locale)}
            {event.endDate && ` — ${formatPartialDate(event.endDate, locale)}`}
            {place && ` · ${place.name}`}
          </p>
        </div>
        {(showEdit || showDelete) && (
          <div className="flex gap-2">
            {showEdit && (
              <LinkButton
                variant="outline"
                size="sm"
                href={`/families/${slug}/events/${eventId}/edit`}
                className="flex-1 sm:flex-none"
              >
                {t("common.edit")}
              </LinkButton>
            )}
            {showDelete && subject && (
              <DeleteEventButton
                familyId={familyId}
                personId={subject.personId}
                eventId={eventId}
                eventTitle={event.title}
                className="flex-1 sm:flex-none"
              />
            )}
          </div>
        )}
      </div>

      {event.description && (
        <ProfileSection title={t("event.description")}>
          <p className="text-sm whitespace-pre-wrap">{event.description}</p>
        </ProfileSection>
      )}

      <ProfileSection title={t("event.participants")}>
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
                  {wording.roleLabel(p.role)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ProfileSection>
    </main>
  );
}
