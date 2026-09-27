import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getVisiblePerson } from "@/domain/person/person.service";
import { listPlaces } from "@/domain/place/place.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { resolvePersonIdBySlug } from "@/lib/resolve-person-slug";

/**
 * Everything the person edit form needs, shared by both ways it renders:
 * the standalone /…/edit page and the EditPanel over the profile
 * (@modal/(.)edit). Same auth → requireFamilyAccess("editor") → visible
 * person chain in both, so the panel is never a weaker path to the form.
 * Returns null without a session (the (app) layout redirects to login).
 */
export async function loadPersonEdit(slug: string, personSlug: string) {
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "editor");
  const personId = await resolvePersonIdBySlug(personSlug, familyId);
  const person = await getVisiblePerson(personId, familyId, {
    userId: session.user.id,
    role: member.role,
  });
  if (!person) notFound();

  return { familyId, personId, person, places: await listPlaces(familyId) };
}
