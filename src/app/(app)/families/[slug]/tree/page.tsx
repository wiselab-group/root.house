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
    return typeof parsed === "object" && parsed !== null
      ? (parsed as PersonFilter)
      : {};
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
  const member = await requireFamilyAccess(familyId, session.user.id, "viewer");
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

  // Priority: explicit ?focus= link/click > this user's own saved default
  // (family-settings, per-user — see family.service.ts::updateDefaultFocusPerson)
  // > the first person in the family, as an arbitrary-but-stable fallback.
  // people.some(...) guards both sources against a stale/foreign id (a
  // deleted person, or a default saved before a person was removed).
  const focusPersonId =
    (typeof focus === "string" && people.some((p) => p.id === focus)
      ? focus
      : null) ??
    (member.defaultFocusPersonId &&
    people.some((p) => p.id === member.defaultFocusPersonId)
      ? member.defaultFocusPersonId
      : null) ??
    people[0].id;

  const filter = parseFilterParam(
    typeof filterParam === "string" ? filterParam : undefined,
  );
  const traceAId =
    typeof traceA === "string" && people.some((p) => p.id === traceA)
      ? traceA
      : null;
  const traceBId =
    typeof traceB === "string" && people.some((p) => p.id === traceB)
      ? traceB
      : null;

  const [layoutGraph, traceOutcome] = await Promise.all([
    getFocusTreeLayout(familyId, focusPersonId, {
      // Show the whole connected family, not just a 2-generation window
      // around the focus person — this app's family archives are small
      // enough that there's no reason to make the user click through
      // generation-by-generation to see everyone.
      ancestorGenerations: Infinity,
      descendantGenerations: Infinity,
      filter: isEmptyFilter(filter) ? undefined : filter,
    }),
    traceAId && traceBId
      ? findRelationshipPathFor(traceAId, traceBId, familyId)
      : Promise.resolve(null),
  ]);

  const tracedGraph = applyRelationshipTrace(layoutGraph, traceOutcome);
  const peopleById = new Map(people.map((p) => [p.id, p]));

  return (
    // The canvas is the only thing on this page, full-bleed on every
    // viewport — no heading/subtitle above it. TreeCanvas sizes itself off
    // a single constant (the app header's height, see its own h-[calc(...)]),
    // so any extra in-flow element here would silently push the canvas
    // past the bottom of the viewport (that heading used to do exactly
    // this before it was removed). AppHeader's breadcrumb trail (set via
    // SetBreadcrumbs, which itself renders nothing) already reads "Семейное
    // дерево" — a second, redundant h1 wasn't earning back that risk.
    <main className="relative">
      <SetBreadcrumbs items={breadcrumbItems} />
      <TreeToolbar
        familyId={familyId}
        familySlug={slug}
        graph={tracedGraph}
        highlight={{
          filterMatchedIds:
            "matchedIds" in layoutGraph ? layoutGraph.matchedIds : undefined,
          // Only pass trace sets when a trace is actually active (both A and B
          // picked) — an always-present-but-empty Set would make every node
          // read as "trace active, just not on it" and dim the whole tree by
          // default. See xyflow-adapter.ts's toFlowNode: isOnTracePath is only
          // computed when highlight.tracePersonIds is present at all.
          tracePersonIds: traceOutcome ? tracedGraph.tracePersonIds : undefined,
          traceEdgeIds: traceOutcome ? tracedGraph.traceEdgeIds : undefined,
        }}
        traceA={
          traceAId
            ? {
                id: traceAId,
                name: personDisplayName(peopleById.get(traceAId)!),
              }
            : null
        }
        traceB={
          traceBId
            ? {
                id: traceBId,
                name: personDisplayName(peopleById.get(traceBId)!),
              }
            : null
        }
        traceOutcome={traceOutcome}
        filter={filter}
      />
    </main>
  );
}
