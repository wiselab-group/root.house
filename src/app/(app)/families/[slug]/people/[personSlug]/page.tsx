import { getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getVisiblePerson } from "@/domain/person/person.service";
import { personDisplayName } from "@/domain/person/display-name";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { resolvePersonIdBySlug } from "@/lib/resolve-person-slug";
import { PersonProfileView } from "./profile-view";

export async function generateMetadata({
  params,
}: PageProps<"/families/[slug]/people/[personSlug]">): Promise<Metadata> {
  const locale = await getLocale();
  const { slug, personSlug } = await params;
  const session = await auth();
  if (!session?.user) return {};

  // Both resolvers call notFound() themselves for an unknown slug (supported
  // inside generateMetadata) — person can still be null if the row was
  // deleted between resolving the slug and fetching it, or if it exists but
  // isn't visible to this caller (getVisiblePerson treats both the same,
  // so a PRIVATE person's name never leaks into the page <title>).
  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  const personId = await resolvePersonIdBySlug(personSlug, familyId);
  const person = await getVisiblePerson(personId, familyId, {
    userId: session.user.id,
    role: member.role,
  });
  if (!person) notFound();
  return { title: personDisplayName(person, locale) };
}

export default async function PersonProfilePage({
  params,
}: PageProps<"/families/[slug]/people/[personSlug]">) {
  const { slug, personSlug } = await params;
  return <PersonProfileView slug={slug} personSlug={personSlug} />;
}
