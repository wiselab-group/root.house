import Link from "next/link";
import type { TreeLayoutGraph } from "@/domain/tree/tree-layout.builder";
import { personDisplayName } from "@/domain/person/display-name";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Mobile alternative to TreeCanvas — not a shrunk-down desktop graph (large
 * pan/zoom canvases are awkward on small screens, per plan §6/§13), but a
 * card-based focus navigator: one central focus card plus horizontally-
 * scrolling relative lists (parents/spouses/children/siblings) below it.
 * Tapping any relative makes them the new focus by writing ?focus=personId,
 * same mechanism TreeCanvas uses, so the two views share the URL contract
 * and either one can deep-link into the other.
 *
 * Reads the same TreeLayoutGraph the desktop canvas does — genuinely the
 * same underlying data, different renderer, per the plan's "different UI
 * representations of the same graph" principle.
 */
export function MobileFocusView({ graph, familySlug }: { graph: TreeLayoutGraph; familySlug: string }) {
  const focusNode = graph.nodes.find((n) => n.isFocus);
  if (!focusNode) return null;

  const parentIds = new Set(
    graph.edges.filter((e) => e.kind === "parent_child" && e.target === focusNode.id).map((e) => e.source),
  );
  const childIds = new Set(
    graph.edges.filter((e) => e.kind === "parent_child" && e.source === focusNode.id).map((e) => e.target),
  );
  const spouseIds = new Set(
    graph.edges
      .filter((e) => e.kind === "partnership" && (e.source === focusNode.id || e.target === focusNode.id))
      .map((e) => (e.source === focusNode.id ? e.target : e.source)),
  );
  // Siblings: same generation as focus, not the focus person, not a spouse.
  const siblingIds = new Set(
    graph.nodes
      .filter((n) => n.generation === focusNode.generation && n.id !== focusNode.id && !spouseIds.has(n.id))
      .map((n) => n.id),
  );

  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const parents = [...parentIds].map((id) => byId.get(id)).filter((n) => n != null);
  const children = [...childIds].map((id) => byId.get(id)).filter((n) => n != null);
  const spouses = [...spouseIds].map((id) => byId.get(id)).filter((n) => n != null);
  const siblings = [...siblingIds].map((id) => byId.get(id)).filter((n) => n != null);

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-primary">
        <CardHeader>
          <CardTitle>{personDisplayName(focusNode.person)}</CardTitle>
        </CardHeader>
        <CardContent>
          <Link
            href={`/families/${familySlug}/people/${focusNode.personId}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            Открыть профиль
          </Link>
        </CardContent>
      </Card>

      <RelativeRow title="Родители" nodes={parents} />
      <RelativeRow title="Супруги" nodes={spouses} />
      <RelativeRow title="Дети" nodes={children} />
      <RelativeRow title="Братья и сёстры" nodes={siblings} />
    </div>
  );
}

function RelativeRow({
  title,
  nodes,
}: {
  title: string;
  nodes: TreeLayoutGraph["nodes"];
}) {
  if (nodes.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {nodes.map((node) => (
          <Link
            key={node.id}
            href={`?focus=${node.personId}`}
            scroll={false}
            className="shrink-0"
          >
            <Card
              className={
                "w-[160px] transition-colors hover:border-foreground/30" +
                (node.person.isPlaceholder ? " border-dashed opacity-70" : "")
              }
            >
              <CardContent className="py-3">
                <p className="truncate text-sm font-medium">{personDisplayName(node.person)}</p>
                {node.person.isPlaceholder && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    неизвестно
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
