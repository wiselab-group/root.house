import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { getPerson } from "@/domain/person/person.service";
import { personDisplayName } from "@/domain/person/display-name";
import { formatPartialDate } from "@/domain/shared/partial-date";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PersonFamilyPanel } from "@/components/person/person-family-panel";

export default async function PersonProfilePage({
  params,
}: PageProps<"/families/[familyId]/people/[personId]">) {
  const { familyId, personId } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  const person = await getPerson(personId, familyId);
  if (!person) notFound();

  const canEdit = member.role === "owner" || member.role === "editor";

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{personDisplayName(person)}</h1>
          <p className="text-muted-foreground">
            {formatPartialDate(person.birthDate)}
            {!person.isLiving && ` — ${formatPartialDate(person.deathDate)}`}
          </p>
        </div>
        {canEdit && (
          <LinkButton variant="outline" href={`/families/${familyId}/people/${personId}/edit`}>
            Редактировать
          </LinkButton>
        )}
      </div>

      {person.isPlaceholder && <Badge variant="secondary">Запись-заглушка — данные неизвестны</Badge>}

      <Card>
        <CardHeader>
          <CardTitle>Основная информация</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <InfoRow label="Девичья фамилия" value={person.maidenName} />
          <InfoRow label="Прозвище" value={person.nickname} />
          <InfoRow label="Религия" value={person.religion} />
          <InfoRow label="Национальность" value={person.nationality} />
        </CardContent>
      </Card>

      {person.description && (
        <Card>
          <CardHeader>
            <CardTitle>Описание</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{person.description}</CardContent>
        </Card>
      )}

      <PersonFamilyPanel familyId={familyId} personId={personId} canEdit={canEdit} />
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
