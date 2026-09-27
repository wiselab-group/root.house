import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getVisiblePerson } from "@/domain/person/person.service";
import { getPlace } from "@/domain/place/place.service";
import { personDisplayName } from "@/domain/person/display-name";
import { profilePlace } from "@/domain/person/profile-place";
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

/**
 * The Person Profile itself — rendered by page.tsx, and by edit/page.tsx
 * under the EditPanel on a hard load of /…/edit (refresh or a shared link),
 * so reloading while editing shows the same profile + panel as the
 * intercepted soft navigation did, not a different page (user report
 * 2026-09-27).
 */
export async function PersonProfileView({
  slug,
  personSlug,
}: {
  slug: string;
  personSlug: string;
}) {
  const tn = await getTranslations("familyNav");
  const locale = await getLocale();
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
    residencePlace,
    family,
    archive,
    allDocuments,
    allPhotos,
    avatarMedia,
  ] = await Promise.all([
    person.birthPlaceId ? getPlace(person.birthPlaceId, familyId) : null,
    person.deathPlaceId ? getPlace(person.deathPlaceId, familyId) : null,
    person.residencePlaceId
      ? getPlace(person.residencePlaceId, familyId)
      : null,
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
  // A residence left over from before the person was marked deceased isn't
  // "where they live" any more — dropped everywhere, not just in the hero.
  const residencePlaceName = person.isLiving
    ? (residencePlace?.name ?? null)
    : null;
  return (
    <main className="dark photo-backdrop min-h-svh">
      <SetBreadcrumbs
        items={[
          { label: tn("myFamilies"), href: "/families" },
          { label: family?.name ?? slug, href: `/families/${slug}` },
          { label: tn("people"), href: `/families/${slug}/people` },
          { label: personDisplayName(person, locale) },
        ]}
      />
      <PersonProfileHero
        person={person}
        familyId={familyId}
        familySlug={slug}
        avatarMedia={avatarMedia}
        place={profilePlace({
          isLiving: person.isLiving,
          birthPlaceName,
          deathPlaceName,
          residencePlaceName,
        })}
        role={member.role}
      />
      <PersonProfileSections
        person={person}
        familyId={familyId}
        familySlug={slug}
        birthPlaceName={birthPlaceName}
        deathPlaceName={deathPlaceName}
        residencePlaceName={residencePlaceName}
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
