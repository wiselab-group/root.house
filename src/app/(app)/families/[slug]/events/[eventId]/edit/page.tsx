import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getVisibleEvent } from "@/domain/event/event.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { loadEventEdit } from "@/lib/load-event-edit";
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
  const t = await getTranslations("event");
  return { title: t("editTitle", { title: event.title }) };
}

export default async function EditEventPage({
  params,
}: PageProps<"/families/[slug]/events/[eventId]/edit">) {
  const { slug, eventId } = await params;
  const locale = await getLocale();
  const data = await loadEventEdit(slug, eventId, locale);
  if (!data) return null;
  const { familyId, event, participants, places } = data;

  const t = await getTranslations();
  const family = await getFamilySummary(familyId);

  const subject = participants[0];
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
    {
      label: event.title,
      href: `/families/${slug}/events/${eventId}`,
    },
    { label: t("common.edit") },
  ];

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12 sm:py-16">
      <SetBreadcrumbs items={breadcrumbItems} />
      <h1 className="font-heading text-title font-medium tracking-tight text-balance">
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
