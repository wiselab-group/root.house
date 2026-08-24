import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { listPeople } from "@/domain/person/person.service";
import { getFocusTreeLayout } from "@/domain/tree/tree.service";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { TreeCanvas } from "@/components/tree/tree-canvas";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";
import { getFamilySummary } from "@/domain/family/family.service";

export default async function FamilyTreePage({
  params,
  searchParams,
}: PageProps<"/families/[slug]/tree">) {
  const { slug } = await params;
  const { focus } = await searchParams;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  await requireFamilyAccess(familyId, session.user.id, "viewer");
  const [people, family] = await Promise.all([
    listPeople(familyId),
    getFamilySummary(familyId),
  ]);
  const breadcrumbItems = [
    { label: "Мои семьи", href: "/families" },
    { label: family?.name ?? slug, href: `/families/${slug}` },
    { label: "Семейное дерево" },
  ];

  if (people.length === 0) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
        <SetBreadcrumbs items={breadcrumbItems} />
        <Card>
          <CardHeader>
            <CardTitle>Дерево пока пустое</CardTitle>
            <CardDescription>
              Добавьте хотя бы одного человека, чтобы увидеть дерево.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LinkButton href={`/families/${slug}/people/new`}>
              Добавить человека
            </LinkButton>
          </CardContent>
        </Card>
      </main>
    );
  }

  const focusPersonId =
    typeof focus === "string" && people.some((p) => p.id === focus)
      ? focus
      : people[0].id;

  const graph = await getFocusTreeLayout(familyId, focusPersonId);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
      <SetBreadcrumbs items={breadcrumbItems} />
      <div>
        <h1 className="font-heading text-2xl font-medium">Семейное дерево</h1>
        <p className="text-muted-foreground">
          Кликните на человека, чтобы сделать его центром дерева.
        </p>
      </div>

      <TreeCanvas graph={graph} familyId={familyId} />
    </main>
  );
}
