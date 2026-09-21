import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { canEdit } from "@/domain/family/permissions";
import {
  getVisibleEvent,
  getParticipantsWithNames,
} from "@/domain/event/event.service";
import { listPlaces } from "@/domain/place/place.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { EditEventForm } from "@/components/forms/edit-event-form";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { getFamilySummary } from "@/domain/family/family.service";

export async function generateMetadata({
  params,
}: PageProps<"/families/[slug]/events/[eventId]/edit">): Promise<Metadata> {
  const { slug, eventId } = await params;
  const session = await auth();
  if (!session?.user) return {};

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  const event = await getVisibleEvent(eventId, familyId, {
    userId: session.user.id,
    role: member.role,
  });
  if (!event) return {};
  return { title: `Редактировать — ${event.title}` };
}

export default async function EditEventPage({
  params,
}: PageProps<"/families/[slug]/events/[eventId]/edit">) {
  const { slug, eventId } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(
    familyId,
    session.user.id,
    "contributor",
  );
  const event = await getVisibleEvent(eventId, familyId, {
    userId: session.user.id,
    role: member.role,
  });
  if (!event) notFound();
  if (
    !canEdit(
      { userId: session.user.id, role: member.role },
      { privacyLevel: event.privacyLevel, createdBy: event.createdBy ?? "" },
    )
  ) {
    notFound();
  }

  const [participants, places, family] = await Promise.all([
    getParticipantsWithNames(eventId, familyId),
    listPlaces(familyId),
    getFamilySummary(familyId),
  ]);

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
    {
      label: event.title,
      href: `/families/${slug}/events/${eventId}`,
    },
    { label: "Редактировать" },
  ];

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12 sm:py-16">
      <SetBreadcrumbs items={breadcrumbItems} />
      <h1 className="font-heading text-3xl font-medium tracking-tight text-balance">
        {event.title}
      </h1>

      <EditEventForm
        familyId={familyId}
        event={event}
        participants={participants.map((p) => ({
          personId: p.personId,
          name: p.name,
          role: p.role,
        }))}
        places={places}
        cancelHref={`/families/${slug}/events/${eventId}`}
      />
    </main>
  );
}
