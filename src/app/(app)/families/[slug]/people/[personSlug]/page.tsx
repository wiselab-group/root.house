import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getVisiblePerson } from "@/domain/person/person.service";
import { getPlace } from "@/domain/place/place.service";
import { personDisplayName } from "@/domain/person/display-name";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { resolvePersonIdBySlug } from "@/lib/resolve-person-slug";
import { PersonProfileHero } from "@/components/person/person-profile-hero";
import { PersonProfileSections } from "@/components/person/person-profile-sections";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { getFamilySummary } from "@/domain/family/family.service";
import { getPersonArchiveSummary } from "@/domain/tree/archive-summary";
import {
  getMedia,
  getPersonGallery,
  getPersonDocuments,
  filterVisibleGalleryPhotos,
  filterVisibleMedia,
} from "@/domain/media/media.service";

export async function generateMetadata({
  params,
}: PageProps<"/families/[slug]/people/[personSlug]">): Promise<Metadata> {
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
  return { title: personDisplayName(person) };
}

export default async function PersonProfilePage({
  params,
}: PageProps<"/families/[slug]/people/[personSlug]">) {
  const { slug, personSlug } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  const viewer = { userId: session.user.id, role: member.role };
  const personId = await resolvePersonIdBySlug(personSlug, familyId);
  const person = await getVisiblePerson(personId, familyId, viewer);
  if (!person) notFound();

  const canEdit = member.role === "owner" || member.role === "editor";
  // Broader than canEdit: a contributor may add Event/Media/Story (see
  // domain/family/permissions.ts::canCreate) even though they can't edit
  // the Person itself or anyone else's past contributions.
  const canContribute = canEdit || member.role === "contributor";

  const [
    birthPlace,
    deathPlace,
    family,
    archive,
    allDocuments,
    allPhotos,
    avatarMedia,
  ] = await Promise.all([
    person.birthPlaceId ? getPlace(person.birthPlaceId, familyId) : null,
    person.deathPlaceId ? getPlace(person.deathPlaceId, familyId) : null,
    getFamilySummary(familyId),
    getPersonArchiveSummary(personId, familyId, viewer),
    getPersonDocuments(personId, familyId),
    getPersonGallery(personId, familyId),
    // The avatar is its own Media row, deliberately not tagged into this
    // person's gallery (see media.service.ts::uploadPersonAvatar) — so it
    // never shows up in getPersonGallery and must be fetched separately for
    // PersonProfileHero's dimensions (portrait vs landscape crop).
    person.photoMediaId ? getMedia(person.photoMediaId, familyId) : null,
  ]);
  const documentCount = filterVisibleMedia(allDocuments, viewer).length;
  const photos = filterVisibleGalleryPhotos(allPhotos, viewer);

  const birthPlaceName = birthPlace?.name ?? null;
  const deathPlaceName = deathPlace?.name ?? null;
  return (
    <main className="dark photo-backdrop min-h-svh">
      <SetBreadcrumbs
        items={[
          { label: "Мои семьи", href: "/families" },
          { label: family?.name ?? slug, href: `/families/${slug}` },
          { label: "Люди", href: `/families/${slug}/people` },
          { label: personDisplayName(person) },
        ]}
      />
      <PersonProfileHero
        person={person}
        familyId={familyId}
        familySlug={slug}
        avatarMedia={avatarMedia}
        birthPlaceName={birthPlaceName}
        deathPlaceName={deathPlaceName}
        role={member.role}
      />
      <PersonProfileSections
        person={person}
        familyId={familyId}
        familySlug={slug}
        birthPlaceName={birthPlaceName}
        deathPlaceName={deathPlaceName}
        counts={{
          stories: archive.storyCount,
          events: archive.eventCount,
          documents: documentCount,
        }}
        photos={photos}
        viewer={viewer}
        canEdit={canEdit}
        canContribute={canContribute}
      />
    </main>
  );
}
