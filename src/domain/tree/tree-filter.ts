import type { TreeLayoutGraph, LayoutNode, PersonNode } from "./tree-layout.builder";

/**
 * tree-filter.ts — Filter/Focus layer (plan §7-8). Operates on an already-
 * built TreeLayoutGraph (post tree-layout.builder.ts, pre React Flow
 * adapter) — never on the database and never on @xyflow/react types, so it
 * stays reusable if the viz library changes.
 *
 * Deliberately does NOT prune the genealogy structure by default: the
 * primary mode is `highlight` (plan §7) — matching people are marked,
 * everyone else stays in the tree at reduced visual weight, so the shape of
 * the family is never destroyed by filtering. `hide` mode exists for when a
 * caller genuinely wants a pruned view, but `highlight` is the default a UI
 * should reach for first.
 *
 * Filter fields are intentionally limited to what Person actually has today
 * (religion/nationality/gender/isLiving/birth-death year range) — no
 * MedicalCondition field exists on the schema yet (plan §22's "не делать
 * сейчас" doesn't list it either), so a `diseases` filter isn't wired up
 * here; PersonFilter is structured as an open set of matcher predicates
 * specifically so a future field (once it exists in the schema) plugs in as
 * one more predicate without changing applyFilter's shape.
 */

export type FilterMode = "highlight" | "focus" | "hide";

export interface PersonFilter {
  gender?: PersonNode["gender"][];
  religion?: string[];
  nationality?: string[];
  isLiving?: boolean;
  birthYearFrom?: number;
  birthYearTo?: number;
  deathYearFrom?: number;
  deathYearTo?: number;
}

/** True if a filter has no criteria set — matchesFilter treats this as "match everyone". */
export function isEmptyFilter(filter: PersonFilter): boolean {
  return Object.values(filter).every((v) => v === undefined);
}

/**
 * Does `person` satisfy every criterion set on `filter`? Criteria are AND'd
 * together; an unset criterion never excludes anyone (e.g. no `gender` set
 * means gender isn't checked at all, not "must be unknown").
 */
export function matchesFilter(person: PersonNode, filter: PersonFilter): boolean {
  if (filter.gender && !filter.gender.includes(person.gender)) return false;
  if (filter.religion && (!person.religion || !filter.religion.includes(person.religion))) return false;
  if (filter.nationality && (!person.nationality || !filter.nationality.includes(person.nationality))) return false;
  if (filter.isLiving !== undefined && person.isLiving !== filter.isLiving) return false;

  if (filter.birthYearFrom !== undefined && (person.birthYear === null || person.birthYear < filter.birthYearFrom)) return false;
  if (filter.birthYearTo !== undefined && (person.birthYear === null || person.birthYear > filter.birthYearTo)) return false;

  if (filter.deathYearFrom !== undefined && (person.deathYear === null || person.deathYear < filter.deathYearFrom)) return false;
  if (filter.deathYearTo !== undefined && (person.deathYear === null || person.deathYear > filter.deathYearTo)) return false;

  return true;
}

export interface FilteredTreeLayoutGraph extends TreeLayoutGraph {
  /** Person ids that satisfy the filter — always present, even in `hide` mode (== the visible set there). */
  matchedIds: Set<string>;
  mode: FilterMode;
}

/**
 * Applies a PersonFilter to a TreeLayoutGraph.
 *
 * - `highlight` (default): every node stays; `matchedIds` tells the UI which
 *   ones to draw at full emphasis vs dimmed. Structure is fully preserved.
 * - `focus`: same as highlight for the graph shape (nothing removed) — the
 *   distinction from `highlight` is a UI-level intensity choice (e.g. also
 *   dim edges, not just nodes), not a structural one, so both modes return
 *   the same node/edge set here; call sites branch on `mode` for styling.
 * - `hide`: nodes NOT in matchedIds are removed, and any edge touching a
 *   removed node is dropped with it (mirrors buildFocusTreeLayout's own
 *   "only edges between two visible nodes" rule, so a `hide`-filtered graph
 *   is exactly as well-formed as any other TreeLayoutGraph — no dangling edges).
 */
export function applyFilter(
  graph: TreeLayoutGraph,
  filter: PersonFilter,
  mode: FilterMode = "highlight",
): FilteredTreeLayoutGraph {
  const matchedIds = new Set<string>();
  for (const node of graph.nodes) {
    if (isEmptyFilter(filter) || matchesFilter(node.person, filter)) {
      matchedIds.add(node.id);
    }
  }

  if (mode !== "hide") {
    return { ...graph, matchedIds, mode };
  }

  const visibleNodes: LayoutNode[] = graph.nodes.filter((n) => matchedIds.has(n.id));
  const visibleIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = graph.edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));

  return {
    nodes: visibleNodes,
    edges: visibleEdges,
    focusPersonId: graph.focusPersonId,
    matchedIds,
    mode,
  };
}
