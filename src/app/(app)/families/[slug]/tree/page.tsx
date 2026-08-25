import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { listPeople } from "@/domain/person/person.service";
import { getFocusTreeLayout } from "@/domain/tree/tree.service";
import { applyRelationshipTrace } from "@/domain/tree/tree-trace";
import { findRelationshipPathFor } from "@/domain/relationship/relationship.service";
import { personDisplayName } from "@/domain/person/display-name";
import { isEmptyFilter, type PersonFilter } from "@/domain/tree/tree-filter";
import { resolveFamilyIdBySlug } from "@/lib/resolve-family-slug";
import { TreeToolbar } from "@/components/tree/tree-toolbar";
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

/** Parses the toolbar's `?filter=<json>` param — malformed/absent input is treated as "no filter", never an error. */
function parseFilterParam(raw: string | undefined): PersonFilter {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as PersonFilter) : {};
  } catch {
    return {};
  }
}

export default async function FamilyTreePage({
  params,
  searchParams,
}: PageProps<"/families/[slug]/tree">) {
  const { slug } = await params;
  const { focus, traceA, traceB, filter: filterParam } = await searchParams;
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

  const filter = parseFilterParam(typeof filterParam === "string" ? filterParam : undefined);
  const traceAId = typeof traceA === "string" && people.some((p) => p.id === traceA) ? traceA : null;
  const traceBId = typeof traceB === "string" && people.some((p) => p.id === traceB) ? traceB : null;

  const [layoutGraph, traceOutcome] = await Promise.all([
    getFocusTreeLayout(familyId, focusPersonId, {
      filter: isEmptyFilter(filter) ? undefined : filter,
    }),
    traceAId && traceBId ? findRelationshipPathFor(traceAId, traceBId, familyId) : Promise.resolve(null),
  ]);

  const tracedGraph = applyRelationshipTrace(layoutGraph, traceOutcome);
  const peopleById = new Map(people.map((p) => [p.id, p]));

  return (
    // No side padding / heading below md — the canvas needs the full
    // viewport to be comfortably pinch-zoomable/pannable on a touchscreen
    // (see TreeCanvas, which matches with a near-full-height, edge-to-edge
    // canvas there too). Desktop keeps the framed, padded page.
    <main className="mx-auto flex max-w-5xl flex-col gap-4 md:p-6">
      <SetBreadcrumbs items={breadcrumbItems} />
      <div className="hidden md:block">
        <h1 className="font-heading text-2xl font-medium">Семейное дерево</h1>
        <p className="text-muted-foreground">
          Кликните на человека, чтобы сделать его центром дерева.
        </p>
      </div>

      {/* relative: TreeToolbar's floating filter button + trace badge
          (and TreeCanvas's own top-left trace control cluster) position
          themselves against this wrapper, overlaying the canvas instead of
          taking their own row — the canvas is deliberately full-bleed on
          mobile (see TreeCanvas), so nothing here may add a fixed-height row. */}
      <div className="relative">
        <TreeToolbar
          familyId={familyId}
          graph={tracedGraph}
          highlight={{
            filterMatchedIds: "matchedIds" in layoutGraph ? layoutGraph.matchedIds : undefined,
            // Only pass trace sets when a trace is actually active (both A and B
            // picked) — an always-present-but-empty Set would make every node
            // read as "trace active, just not on it" and dim the whole tree by
            // default. See xyflow-adapter.ts's toFlowNode: isOnTracePath is only
            // computed when highlight.tracePersonIds is present at all.
            tracePersonIds: traceOutcome ? tracedGraph.tracePersonIds : undefined,
            traceEdgeIds: traceOutcome ? tracedGraph.traceEdgeIds : undefined,
          }}
          traceA={traceAId ? { id: traceAId, name: personDisplayName(peopleById.get(traceAId)!) } : null}
          traceB={traceBId ? { id: traceBId, name: personDisplayName(peopleById.get(traceBId)!) } : null}
          traceOutcome={traceOutcome}
          filter={filter}
        />
      </div>
    </main>
  );
}
