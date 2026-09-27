import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getVisibleEvent } from "@/domain/event/event.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { EditPanel } from "@/components/edit-panel/edit-panel";
import { EventView } from "../event-view";
import { EventEditPanelContent } from "./panel-content";

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

/** A hard load of /…/edit: the event page with the same EditPanel over it
 *  that a click opens — see people/[personSlug]/edit/page.tsx. */
export default async function EditEventPage({
  params,
}: PageProps<"/families/[slug]/events/[eventId]/edit">) {
  const { slug, eventId } = await params;
  return (
    <>
      <EventView slug={slug} eventId={eventId} />
      <EditPanel closeHref={`/families/${slug}/events/${eventId}`}>
        <EventEditPanelContent slug={slug} eventId={eventId} />
      </EditPanel>
    </>
  );
}
