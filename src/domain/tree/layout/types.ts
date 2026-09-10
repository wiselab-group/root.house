/**
 * Семейное дерево — доменные типы layout-движка (единственная production-
 * реализация). Форма входного графа (Person + Relationship) следует боевой
 * модели Person+Relationship
 * (CLAUDE.md WHAT — "родословная это граф в БД, а не дерево"), но объявлена
 * здесь отдельно от src/domain/person и src/domain/relationship — DB-формы
 * маппятся в неё явно в tree-adapter.ts, а не импортируются напрямую.
 *
 * Только plain data — никакого React/xyflow (src/domain/** не импортирует
 * next/react, CLAUDE.md CODE RULES).
 */

export type Gender = "male" | "female" | "unknown";

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
}

export type RelationshipKind = "spouse" | "parent-child";

/** Historical state of a partnership; layout must not drop the edge on divorce. */
export type PartnershipStatus =
  "married" | "partnered" | "divorced" | "widowed";

/**
 * DB parentRole has 5 values; step/foster/unknown are lumped with adoptive
 * for rendering purposes (all "not a recorded biological line") — see
 * tree layout rules in CLAUDE.md. Not yet consumed anywhere in the engine
 * (added ahead of the render-side dashed-line work — see rewrite plan §5.1).
 */
export type ParentRole = "biological" | "adoptive" | "step" | "foster" | "unknown";

export interface Relationship {
  id: string;
  kind: RelationshipKind;
  /** parent-child: from = parent, to = child. spouse: order doesn't matter — graph.ts decides left/right by gender. */
  from: string;
  to: string;
  /** Only meaningful for kind "spouse". Defaults to "married" when absent. */
  status?: PartnershipStatus;
  /** Only meaningful for kind "parent-child". Defaults to "biological" when absent. Not yet read anywhere — see rewrite plan §5.1. */
  parentRole?: ParentRole;
}

export interface FamilyGraph {
  persons: Person[];
  relationships: Relationship[];
  /**
   * Deterministic entry-order tie-break for same-gender spouse pairs and
   * multi-marriage chronological ordering — lower sorts first (left /
   * earlier marriage). Falls back to id when absent or when two people's
   * keys are equal. Not yet consumed by shouldBeLeft — see rewrite plan §1.6.
   */
  orderingKeyByPersonId?: Map<string, string>;
}

// ---------------------------------------------------------------------------
// Normalized graph — built FROM FamilyGraph, does not mutate input.
// ---------------------------------------------------------------------------

export type Direction = "left" | "right" | "up" | "down";

/**
 * Partnership — a layout-level concept (does not need to be a DB entity).
 * One Partnership PER spouse relationship — not one merged "unit" per
 * person — so a person with several marriages (divorce + remarriage) gets
 * several Partnership records, each with its own children, while the person
 * still gets exactly one Person node (mandatory invariant, see collision.ts
 * assertOnePersonNodePerId and layout.test.ts).
 */
export interface Partnership {
  id: string;
  /** husband-first pair (male < unknown < female, tie-broken by id) — see graph.ts shouldBeLeft. */
  leftPersonId: string;
  rightPersonId: string;
  status: PartnershipStatus;
  /** Children born specifically within this partnership (both parents match, or the other parent is absent from the graph). */
  childrenIds: string[];
  /**
   * Chronological marriage order for one person relative to their OTHER
   * partnerships — 0 = earliest, ties broken by partnership id. NOT global
   * across the family; only meaningful for ordering one person's own
   * side-by-side partnership branches left-to-right. Not yet computed by
   * normalizeGraph — see rewrite plan §1.4 (defaults to 0 until then).
   */
  marriageOrder: number;
}

/** A person's children without a recorded partnership (other parent unknown/absent from graph). */
export interface SoloParent {
  personId: string;
  childrenIds: string[];
}

export type Branch =
  "focus" | "paternal" | "maternal" | "descendant" | "unknown";

export interface NormalizedPerson extends Person {
  /** BFS generation distance from focus (0 = focus, +1 = child, -1 = parent). Soft hint for Y, never a hardcoded row. */
  generation: number;
  partnershipIds: string[];
  parentIds: string[];
  /** Soft directional hint — paternal grows left, maternal grows right, propagated recursively (see graph.ts). */
  branch: Branch;
}

export interface NormalizedGraph {
  personById: Map<string, NormalizedPerson>;
  partnershipById: Map<string, Partnership>;
  soloParentByPersonId: Map<string, SoloParent>;
  relationships: Relationship[];
  focusPersonId: string;
}

// ---------------------------------------------------------------------------
// Subtree measurement — how much space a branch needs before it is placed.
// ---------------------------------------------------------------------------

/**
 * A BranchNode is the layout engine's recursive growth unit: either a single
 * person (no recorded partnership) or a partnership (spouses + their shared
 * children). Growth always proceeds branch-by-branch, never "place all nodes
 * then fix collisions" (§17 of the design brief this was built under).
 */
export type BranchRootKind = "person" | "partnership";

export interface SubtreeMeasurement {
  /** Own width in px — a single person card, or two cards + spouse gap for a partnership. */
  ownWidth: number;
  /** Total width required by this branch's own row plus every descendant row beneath it, already including sibling/branch margins. */
  totalWidth: number;
  /** Number of descendant generations beneath this branch (0 = childless). */
  depth: number;
}

// ---------------------------------------------------------------------------
// Placement output.
// ---------------------------------------------------------------------------

export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Point {
  width: number;
  height: number;
}

export interface LaidOutPerson extends NormalizedPerson {
  x: number;
  y: number;
}

export interface LaidOutPartnership extends Partnership {
  /** Junction point used for the T-shaped connector down to children. */
  x: number;
  y: number;
}

export interface TreeLayoutResult {
  persons: LaidOutPerson[];
  partnerships: LaidOutPartnership[];
  relationships: Relationship[];
  focusPersonId: string;
}
