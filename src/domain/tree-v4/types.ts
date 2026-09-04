/**
 * tree-v4 — доменные типы. Полностью независимая реализация: не импортирует
 * ничего из tree-v2 или tree-v3. Форма входного графа (Person + Relationship)
 * следует боевой модели Person+Relationship (CLAUDE.md WHAT — "родословная
 * это граф в БД, а не дерево"), но заново объявлена здесь, чтобы tree-v4 не
 * зависел молча от чужих типов, если те когда-нибудь изменятся.
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

export interface Relationship {
  id: string;
  kind: RelationshipKind;
  /** parent-child: from = parent, to = child. spouse: order doesn't matter — graph.ts decides left/right by gender. */
  from: string;
  to: string;
  /** Only meaningful for kind "spouse". Defaults to "married" when absent. */
  status?: PartnershipStatus;
}

export interface FamilyGraph {
  persons: Person[];
  relationships: Relationship[];
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
