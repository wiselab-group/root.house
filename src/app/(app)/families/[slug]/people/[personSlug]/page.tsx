import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getPerson } from "@/domain/person/person.service";
import { getPlace } from "@/domain/place/place.service";
import { personDisplayName } from "@/domain/person/display-name";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { resolvePersonIdBySlug } from "@/lib/resolve-person-slug";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PersonFamilyPanel } from "@/components/person/person-family-panel";
import { PersonTimeline } from "@/components/person/person-timeline";
import { PersonMediaGallery } from "@/components/person/person-media-gallery";
import { PersonStories } from "@/components/person/person-stories";
import { PersonProfileHeader } from "@/components/person/person-profile-header";
import { InfoRow } from "@/components/person/person-info-row";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { getFamilySummary } from "@/domain/family/family.service";

export default async function PersonProfilePage({
  params,
}: PageProps<"/families/[slug]/people/[personSlug]">) {
  const { slug, personSlug } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  const personId = await resolvePersonIdBySlug(personSlug, familyId);
  const person = await getPerson(personId, familyId);
  if (!person) notFound();

  const canEdit = member.role === "owner" || member.role === "editor";

  const [birthPlace, deathPlace, family] = await Promise.all([
    person.birthPlaceId ? getPlace(person.birthPlaceId, familyId) : null,
    person.deathPlaceId ? getPlace(person.deathPlaceId, familyId) : null,
    getFamilySummary(familyId),
  ]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <SetBreadcrumbs
        items={[
          { label: "Мои семьи", href: "/families" },
          { label: family?.name ?? slug, href: `/families/${slug}` },
          { label: "Люди", href: `/families/${slug}/people` },
          { label: personDisplayName(person) },
        ]}
      />
      <PersonProfileHeader
        person={person}
        personSlug={personSlug}
        familyId={familyId}
        familySlug={slug}
        role={member.role}
        birthPlace={birthPlace}
        deathPlace={deathPlace}
      />

      {person.isPlaceholder && (
        <Badge variant="secondary">Запись-заглушка — данные неизвестны</Badge>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Основная информация</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <InfoRow label="Девичья фамилия" value={person.maidenName} />
          <InfoRow label="Прозвище" value={person.nickname} />
          <InfoRow label="Религия" value={person.religion} />
          <InfoRow label="Национальность" value={person.nationality} />
          <InfoRow label="Место рождения" value={birthPlace?.name ?? null} />
          <InfoRow label="Место смерти" value={deathPlace?.name ?? null} />
          <InfoRow label="Причина смерти" value={person.deathCause} />
        </CardContent>
      </Card>

      {person.description && (
        <Card>
          <CardHeader>
            <CardTitle>Описание</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">
            {person.description}
          </CardContent>
        </Card>
      )}

      <PersonFamilyPanel
        familyId={familyId}
        familySlug={slug}
        personId={personId}
        canEdit={canEdit}
      />
      <PersonMediaGallery
        familyId={familyId}
        personId={personId}
        canEdit={canEdit}
      />
      <PersonTimeline
        familyId={familyId}
        familySlug={slug}
        personId={personId}
        canEdit={canEdit}
      />
      <PersonStories
        familyId={familyId}
        personId={personId}
        canEdit={canEdit}
      />
    </main>
  );
}
