import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { listPeople } from "@/domain/person/person.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PeopleList } from "@/components/person/people-list";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { getFamilySummary } from "@/domain/family/family.service";

export default async function PeoplePage({
  params,
}: PageProps<"/families/[slug]/people">) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  await requireFamilyAccess(familyId, session.user.id, "viewer");
  const [people, family] = await Promise.all([
    listPeople(familyId),
    getFamilySummary(familyId),
  ]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <SetBreadcrumbs
        items={[
          { label: "Мои семьи", href: "/families" },
          { label: family?.name ?? slug, href: `/families/${slug}` },
          { label: "Люди" },
        ]}
      />
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
        <PeopleList familyId={familyId} familySlug={slug} people={people} />
      )}
    </main>
  );
}
