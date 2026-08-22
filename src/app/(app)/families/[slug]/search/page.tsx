import Link from "next/link";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { searchPeople } from "@/domain/search/search.service";
import { personDisplayName } from "@/domain/person/display-name";
import { formatPartialDate } from "@/domain/shared/partial-date";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function SearchPage({
  params,
  searchParams,
}: PageProps<"/families/[slug]/search">) {
  const { slug } = await params;
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";

  const session = await auth();
  if (!session?.user) return null;
  const familyId = await resolveFamilyIdBySlug(slug);
  await requireFamilyAccess(familyId, session.user.id, "viewer");

  const results = query.trim().length > 0 ? await searchPeople(familyId, query) : [];

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-medium">Поиск</h1>
        <p className="text-muted-foreground">По имени, фамилии, девичьей фамилии или году (например, 1920 или 1900-1950).</p>
      </div>

      <form method="GET" className="flex gap-2">
        <Input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Иванов, Анна, 1924…"
          className="flex-1"
          autoFocus
        />
      </form>

      {query.trim().length === 0 ? (
        <p className="text-sm text-muted-foreground">Введите имя, фамилию или год.</p>
      ) : results.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Ничего не найдено</CardTitle>
            <CardDescription>Попробуйте изменить запрос.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {results.map((person) => (
            <li key={person.id}>
              <Link href={`/families/${slug}/people/${person.id}`}>
                <Card className="transition-colors hover:border-foreground/30">
                  <CardHeader>
                    <CardTitle>{personDisplayName(person)}</CardTitle>
                    <CardDescription>
                      {formatPartialDate(person.birthDate)}
                      {person.deathDate && ` — ${formatPartialDate(person.deathDate)}`}
                    </CardDescription>
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
