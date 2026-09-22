import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getVisiblePerson } from "@/domain/person/person.service";
import { getPlace } from "@/domain/place/place.service";
import { personDisplayName } from "@/domain/person/display-name";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { resolvePersonIdBySlug } from "@/lib/resolve-person-slug";
import { Badge } from "@/components/ui/badge";
import { ProfileSection } from "@/components/person/profile-section";
import { PersonFamilyPanel } from "@/components/person/person-family-panel";
import { PersonTimeline } from "@/components/person/person-timeline";
import { PersonMediaGallery } from "@/components/person/person-media-gallery";
import { PersonStories } from "@/components/person/person-stories";
import { PersonProfileHeader } from "@/components/person/person-profile-header";
import { PersonArchiveOverview } from "@/components/person/person-archive-overview";
import { PrivacyBadge } from "@/components/person/privacy-badge";
import { InfoRow } from "@/components/person/person-info-row";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { getFamilySummary } from "@/domain/family/family.service";
import { getPersonArchiveSummary } from "@/domain/tree/archive-summary";

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

  const [birthPlace, deathPlace, family, archive] = await Promise.all([
    person.birthPlaceId ? getPlace(person.birthPlaceId, familyId) : null,
    person.deathPlaceId ? getPlace(person.deathPlaceId, familyId) : null,
    getFamilySummary(familyId),
    getPersonArchiveSummary(personId, familyId, viewer),
  ]);

  const hasBasicInfo =
    person.maidenName ||
    person.nickname ||
    person.religion ||
    person.nationality ||
    birthPlace ||
    deathPlace ||
    person.deathCause;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12 sm:py-16">
      <SetBreadcrumbs
        items={[
          { label: "Мои семьи", href: "/families" },
          { label: family?.name ?? slug, href: `/families/${slug}` },
          { label: "Люди", href: `/families/${slug}/people` },
          { label: personDisplayName(person) },
        ]}
      />
      <div className="flex flex-col gap-4">
        <PersonProfileHeader
          person={person}
          personSlug={personSlug}
          familyId={familyId}
          familySlug={slug}
          role={member.role}
          birthPlace={birthPlace}
          deathPlace={deathPlace}
        />
        {(person.isPlaceholder || person.privacyLevel === "private") && (
          <div className="flex flex-wrap gap-2">
            {person.isPlaceholder && (
              <Badge variant="secondary" className="w-fit">
                Запись-заглушка — данные неизвестны
              </Badge>
            )}
            <PrivacyBadge privacyLevel={person.privacyLevel} />
          </div>
        )}
        <PersonArchiveOverview archive={archive} />
      </div>

      {hasBasicInfo && (
        <ProfileSection title="Основная информация">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <InfoRow label="Девичья фамилия" value={person.maidenName} />
            <InfoRow label="Прозвище" value={person.nickname} />
            <InfoRow label="Религия" value={person.religion} />
            <InfoRow label="Национальность" value={person.nationality} />
            <InfoRow label="Место рождения" value={birthPlace?.name ?? null} />
            <InfoRow label="Место смерти" value={deathPlace?.name ?? null} />
            <InfoRow label="Причина смерти" value={person.deathCause} />
          </div>
        </ProfileSection>
      )}

      {person.description && (
        <ProfileSection title="Описание">
          <p className="text-sm whitespace-pre-wrap">{person.description}</p>
        </ProfileSection>
      )}

      <PersonFamilyPanel
        familyId={familyId}
        familySlug={slug}
        personId={personId}
        canEdit={canEdit}
      />
      <PersonMediaGallery
        familyId={familyId}
        familySlug={slug}
        personId={personId}
        canEdit={canEdit}
        canContribute={canContribute}
        member={viewer}
      />
      <PersonTimeline
        familyId={familyId}
        familySlug={slug}
        personId={personId}
        canEdit={canEdit}
        canContribute={canContribute}
        member={viewer}
      />
      <PersonStories
        familyId={familyId}
        personId={personId}
        canContribute={canContribute}
        canEdit={canEdit}
        member={viewer}
      />
    </main>
  );
}
