import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { listPeople } from "@/domain/person/person.service";
import { getFocusTreeLayout } from "@/domain/tree/tree.service";
import { TreeCanvas } from "@/components/tree/tree-canvas";
import { MobileFocusView } from "@/components/tree/mobile-focus-view";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";

export default async function FamilyTreePage({
  params,
  searchParams,
}: PageProps<"/families/[familyId]/tree">) {
  const { familyId } = await params;
  const { focus } = await searchParams;
  const session = await auth();
  if (!session?.user) return null;

  await requireFamilyAccess(familyId, session.user.id, "viewer");
  const people = await listPeople(familyId);

  if (people.length === 0) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Дерево пока пустое</CardTitle>
            <CardDescription>Добавьте хотя бы одного человека, чтобы увидеть дерево.</CardDescription>
          </CardHeader>
          <CardContent>
            <LinkButton href={`/families/${familyId}/people/new`}>Добавить человека</LinkButton>
          </CardContent>
        </Card>
      </main>
    );
  }

  const focusPersonId = typeof focus === "string" && people.some((p) => p.id === focus)
    ? focus
    : people[0].id;

  const graph = await getFocusTreeLayout(familyId, focusPersonId);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Семейное дерево</h1>
        <p className="hidden text-muted-foreground md:block">
          Кликните на человека, чтобы сделать его центром дерева.
        </p>
        <p className="text-muted-foreground md:hidden">
          Коснитесь родственника, чтобы сделать его центром.
        </p>
      </div>

      {/*
        Desktop gets the full pan/zoom canvas; mobile gets a card-based
        focus navigator instead of a shrunk-down graph (large canvases are
        awkward to use on small screens — plan §6/§13). Both read the same
        TreeLayoutGraph and share the ?focus= URL contract, so this dual
        render is a deliberate trade-off (two DOM trees for one screen),
        not an oversight — see docs/architecture.md.
      */}
      <div className="hidden md:block">
        <TreeCanvas graph={graph} />
      </div>
      <div className="md:hidden">
        <MobileFocusView graph={graph} familyId={familyId} />
      </div>
    </main>
  );
}
