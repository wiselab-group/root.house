import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { requireFamilyAccess } from "@/domain/family/access";
import { listPeople } from "@/domain/person/person.service";
import {
  fetchTreeRows,
  getFocusTreeLayout,
  getRawTreeGraph,
} from "@/domain/tree/tree.service";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tree");
  return { title: t("metaTitle") };
}

// KNOWN GAP: the tree visualization does not yet filter PRIVATE persons out
// of the graph (unlike the /people list, profile pages, and photo/story/
// event views, which do — see domain/family/permissions.ts::canView and its
// filterVisibleX/getVisibleX call sites). The tree's layout algorithm
// (domain/tree/layout/ — see CLAUDE.md's TREE LAYOUT RULES) treats every
// node as always-present for connector-line/spacing invariants; removing a
// node conditionally would need genealogy-aware re-layout (routing lines
// around a hidden ancestor, or promoting a hidden node's children) that is
// out of scope for this iteration. Flagged explicitly rather than papered
// over with a naive filter that would break those invariants.

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
  const t = await getTranslations("tree");
  const tn = await getTranslations("familyNav");
  const { slug } = await params;
  const { focus, filter: filterParam } = await searchParams;
  const session = await auth();
  if (!session?.user) return null;

  const familyId = await resolveFamilyIdBySlug(slug);
  const member = await requireFamilyAccess(familyId, session.user.id, "viewer");
  const [people, family] = await Promise.all([
    listPeople(familyId),
    getFamilySummary(familyId),
  ]);
  const breadcrumbItems = [
    { label: tn("myFamilies"), href: "/families" },
    { label: family?.name ?? slug, href: `/families/${slug}` },
    { label: t("title") },
  ];

  if (people.length === 0) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
        <SetBreadcrumbs items={breadcrumbItems} />
        <Card>
          <CardHeader>
            <CardTitle>{t("emptyTitle")}</CardTitle>
            <CardDescription>{t("emptyBody")}</CardDescription>
          </CardHeader>
          <CardContent>
            <LinkButton href={`/families/${slug}/people/new`}>
              {t("addPerson")}
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
  // Fetched ONCE (persons/relationships/archive-summary) and handed to both
  // getFocusTreeLayout and getRawTreeGraph below — each used to fetch these
  // same rows independently, which silently doubled every underlying query
  // (archive-summary's 3 aggregates included) every page load. See
  // tree.service.ts::fetchTreeRows's own doc comment.
  // ?traceA=/?traceB= (Relationship Trace) are read and resolved entirely
  // client-side — see components/tree/kinship/use-kinship-trace.ts.
  const rows = await fetchTreeRows(familyId, member);
  const layoutGraph = getFocusTreeLayout(rows, focusPersonId, {
    // Show the whole connected family, not just a 2-generation window
    // around the focus person — this app's family archives are small
    // enough that there's no reason to make the user click through
    // generation-by-generation to see everyone.
    ancestorGenerations: Infinity,
    descendantGenerations: Infinity,
    filter: isEmptyFilter(filter) ? undefined : filter,
  });
  // Rewrite plan §7 Stage 7: lets TreeCanvas re-run buildTreeLayout entirely
  // client-side when the user switches focus, instead of a full page reload
  // — see getRawTreeGraph's own doc comment.
  const rawGraph = getRawTreeGraph(rows);

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
        graph={layoutGraph}
        rawGraph={rawGraph}
        highlight={{
          filterMatchedIds:
            "matchedIds" in layoutGraph ? layoutGraph.matchedIds : undefined,
        }}
        filter={filter}
      />
    </main>
  );
}
