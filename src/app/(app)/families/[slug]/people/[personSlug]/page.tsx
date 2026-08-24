import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getPerson } from "@/domain/person/person.service";
import { getPlace } from "@/domain/place/place.service";
import { personDisplayName } from "@/domain/person/display-name";
import { formatPartialDate } from "@/domain/shared/partial-date";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { resolvePersonIdBySlug } from "@/lib/resolve-person-slug";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PersonFamilyPanel } from "@/components/person/person-family-panel";
import { PersonTimeline } from "@/components/person/person-timeline";
import { PersonMediaGallery } from "@/components/person/person-media-gallery";
import { PersonStories } from "@/components/person/person-stories";
import { DeletePersonButton } from "@/components/person/delete-person-button";
import { PersonAvatar } from "@/components/person/person-avatar";

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

  const [birthPlace, deathPlace] = await Promise.all([
    person.birthPlaceId ? getPlace(person.birthPlaceId, familyId) : null,
    person.deathPlaceId ? getPlace(person.deathPlaceId, familyId) : null,
  ]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <PersonAvatar
            person={person}
            familyId={familyId}
            className="size-20! text-xl"
          />
          <div>
            <h1 className="font-heading text-3xl font-medium">
              {personDisplayName(person)}
            </h1>
            <p className="text-muted-foreground">
              {formatPartialDate(person.birthDate)}
              {birthPlace && `, ${birthPlace.name}`}
              {!person.isLiving &&
                ` — ${formatPartialDate(person.deathDate)}${deathPlace ? `, ${deathPlace.name}` : ""}`}
            </p>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <LinkButton
              variant="outline"
              href={`/families/${slug}/people/${personSlug}/edit`}
            >
              Редактировать
            </LinkButton>
            {/* Deletion is restricted to owners — more destructive/
                irreversible than regular editor-level CRUD (cascades to
                relationships, event participation, media links). */}
            {member.role === "owner" && (
              <DeletePersonButton
                familyId={familyId}
                personId={personId}
                personName={personDisplayName(person)}
              />
            )}
          </div>
        )}
      </div>

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

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
