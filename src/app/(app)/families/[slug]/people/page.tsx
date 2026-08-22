import Link from "next/link";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { listPeople } from "@/domain/person/person.service";
import { personDisplayName } from "@/domain/person/display-name";
import { formatPartialDate } from "@/domain/shared/partial-date";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { LinkButton } from "@/components/ui/link-button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { PersonAvatar } from "@/components/person/person-avatar";

export default async function PeoplePage({
  params,
}: PageProps<"/families/[slug]/people">) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  await requireFamilyAccess(familyId, session.user.id, "viewer");
  const people = await listPeople(familyId);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-medium">Люди</h1>
        <LinkButton href={`/families/${slug}/people/new`}>
          Добавить человека
        </LinkButton>
      </div>

      {people.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Пока никого нет</CardTitle>
            <CardDescription>Начните с добавления себя.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {people.map((person) => (
            <li key={person.id}>
              <Link href={`/families/${slug}/people/${person.slug}`}>
                <Card className="transition-colors hover:border-foreground/30">
                  <CardHeader className="flex! flex-row items-center gap-3">
                    <PersonAvatar
                      person={person}
                      familyId={familyId}
                      size="lg"
                      className="size-14! text-base"
                    />
                    <div>
                      <CardTitle>{personDisplayName(person)}</CardTitle>
                      <CardDescription>
                        {formatPartialDate(person.birthDate)}
                        {person.isLiving
                          ? ""
                          : ` — ${formatPartialDate(person.deathDate)}`}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
