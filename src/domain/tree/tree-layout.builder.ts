/**
 * tree-layout.builder.ts — the shared, library-agnostic layout CONTRACT:
 * nodes with (x, y, generation) and edges. Historically this file also
 * contained its own recursive layout algorithm; that algorithm has been
 * replaced by the layout engine in src/domain/tree/layout/ (see
 * tree-adapter.ts, which converts DB rows into that engine's FamilyGraph
 * input and its TreeLayoutResult output back into the TreeLayoutGraph shape
 * declared here). Only the shared types remain in this file, so every
 * existing importer (tree-filter.ts, tree-trace.ts,
 * components/tree/adapters/xyflow-adapter.ts, tree-canvas.tsx,
 * tree-toolbar.tsx, relationship-edge.tsx) keeps resolving
 * `@/domain/tree/tree-layout.builder` unchanged.
 *
 * This file has NO knowledge of @xyflow/react or any other rendering
 * library — the adapter layer (components/tree/adapters/xyflow-adapter.ts)
 * is responsible for translating TreeLayoutGraph into whatever a specific
 * graph-viz library needs.
 */

export interface PersonNode {
  id: string;
  slug: string;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  isPlaceholder: boolean;
  isLiving: boolean;
  birthYear: number | null;
  deathYear: number | null;
  photoMediaId: string | null;
  /** Present so tree-filter.ts can match on them without a second Person lookup — not used by layout positioning itself. */
  gender: "male" | "female" | "unknown";
  religion: string | null;
  nationality: string | null;
}

export interface ParentChildEdgeInput {
  parentId: string;
  childId: string;
}

export interface PartnershipEdgeInput {
  person1Id: string;
  person2Id: string;
  isCurrent: boolean;
}

export interface BuildTreeLayoutInput {
  persons: PersonNode[];
  parentChildEdges: ParentChildEdgeInput[];
  partnershipEdges: PartnershipEdgeInput[];
  focusPersonId: string;
  /**
   * Generations of ancestors to include above focusPersonId. The current
   * layout engine (src/domain/tree/layout/) has no windowing — it always
   * lays out the entire connected graph reachable from focus — so this
   * field is currently IGNORED. Kept on the type for API stability and as
   * a natural extension point (e.g. post-layout pruning by
   * LaidOutPerson.generation) if generation-windowing is wanted later.
   */
  ancestorGenerations?: number;
  /** Generations of descendants to include below focusPersonId. Currently IGNORED — see ancestorGenerations. */
  descendantGenerations?: number;
}

export type LayoutNodeKind = "person";

export interface LayoutNode {
  id: string; // == personId, one node per person in the visible slice
  kind: LayoutNodeKind;
  personId: string;
  x: number;
  y: number;
  /** 0 = focus person's generation, negative = ancestors, positive = descendants. */
  generation: number;
  isFocus: boolean;
  /**
   * True when this person has no recorded relationship at all (see
   * layout/types.ts's NormalizedPerson.isIsolated) — rendered as a
   * connector-less card in a separate row below the tree, with its own
   * "not yet linked" affordance (tree-canvas.tsx), instead of participating
   * in the family-tree visualization proper.
   */
  isIsolated: boolean;
  person: PersonNode;
  /**
   * Set only by the client-side collapse/expand prune (rewrite plan §7
   * Stage 5, components/tree/prune-collapsed.ts) — the count of descendants
   * currently hidden below this person, rendered as a "+N" badge on their
   * card. Undefined for every node the server itself produces (collapse
   * state never reaches the server — see use-collapsed-branches.ts) and for
   * any node here that isn't currently collapsed.
   */
  collapsedDescendantCount?: number;
}

export type LayoutEdgeKind = "parent_child" | "partnership";

export interface LayoutEdge {
  id: string;
  kind: LayoutEdgeKind;
  source: string; // personId
  target: string; // personId
  isCurrent?: boolean; // partnership edges only
}

export interface TreeLayoutGraph {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  focusPersonId: string;
}
