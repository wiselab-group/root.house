import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getVisiblePerson } from "@/domain/person/person.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { resolvePersonIdBySlug } from "@/lib/resolve-person-slug";
import { personDisplayName } from "@/domain/person/display-name";
import { EditPanel } from "@/components/edit-panel/edit-panel";
import { PersonProfileView } from "../profile-view";
import { PersonEditPanelContent } from "./panel-content";

export async function generateMetadata({
  params,
}: PageProps<"/families/[slug]/people/[personSlug]/edit">): Promise<Metadata> {
  const locale = await getLocale();
  const { slug, personSlug } = await params;
  const session = await auth();
  if (!session?.user) return {};

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "editor");
  const personId = await resolvePersonIdBySlug(personSlug, familyId);
  const person = await getVisiblePerson(personId, familyId, {
    userId: session.user.id,
    role: member.role,
  });
  if (!person) notFound();
  const t = await getTranslations("people");
  return { title: t("editTitle", { name: personDisplayName(person, locale) }) };
}

/**
 * A hard load of /…/edit (refresh, shared link): the profile with the same
 * EditPanel over it that a click opens (the intercepted @modal/(.)edit
 * route), so reloading mid-edit doesn't swap in a different page (user
 * report 2026-09-27). With no in-app history to go back to, closing the
 * panel replaces the URL with the profile's.
 */
export default async function EditPersonPage({
  params,
}: PageProps<"/families/[slug]/people/[personSlug]/edit">) {
  const { slug, personSlug } = await params;
  return (
    <>
      <PersonProfileView slug={slug} personSlug={personSlug} />
      <EditPanel closeHref={`/families/${slug}/people/${personSlug}`}>
        <PersonEditPanelContent slug={slug} personSlug={personSlug} />
      </EditPanel>
    </>
  );
}
