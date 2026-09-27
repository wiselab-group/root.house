import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getVisibleEvent } from "@/domain/event/event.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { EventView } from "./event-view";

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
  return <EventView slug={slug} eventId={eventId} />;
}
