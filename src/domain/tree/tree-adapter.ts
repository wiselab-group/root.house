import type { PersonRecord } from "@/domain/person/person.repository";
import type {
  ParentChildRecord,
  PartnershipRecord,
} from "@/domain/relationship/relationship.repository";
import type {
  FamilyGraph,
  Person as EngineePerson,
  Relationship as EngineRelationship,
  PartnershipStatus as EnginePartnershipStatus,
  TreeLayoutResult,
} from "./layout/types";
import { buildTreeLayout } from "./layout/layout";
import type {
  LayoutEdge,
  LayoutNode,
  PersonNode,
  TreeLayoutGraph,
} from "./tree-layout.builder";

/**
 * tree-adapter.ts — bridges the DB's Person/ParentChildRecord/
 * PartnershipRecord shapes (rich, nullable, family-scoped) to the layout
 * engine's own FamilyGraph shape (narrow, non-null names, one flat
 * Relationship[] array) — and the engine's TreeLayoutResult back into the
 * shared TreeLayoutGraph contract (tree-layout.builder.ts) that
 * tree-filter.ts/tree-trace.ts/xyflow-adapter.ts already consume.
 *
 * This is the ONLY place that needs to know both shapes at once.
 */

/**
 * DB PartnershipRecord.status has 5 values; the layout engine's
 * PartnershipStatus has 4 (no "separated"). "separated" couples are still
 * legally partnered/married but living apart — closer to a still-ongoing
 * (if strained) partnership than to a fully dissolved one, so:
 *   - isCurrent === true  -> "partnered"
 *   - isCurrent === false -> "divorced"
 * Low-stakes mapping: it only feeds the engine's own internal status field
 * (bookkeeping, never read for geometry). It does NOT drive the actually-
 * rendered RelationshipEdge.isCurrent flag — that is threaded through
 * losslessly from the original DB row (see partnershipIsCurrentById in
 * fromTreeLayout), never derived from this coerced value.
 */
function toEngineStatus(
  status: PartnershipRecord["status"],
  isCurrent: boolean,
): EnginePartnershipStatus {
  if (status !== "separated") return status;
  return isCurrent ? "partnered" : "divorced";
}

export interface TreeAdapterInput {
  // Pick<>, not the full PersonRecord — this is exactly what the engine
  // itself needs (shouldBeLeft's own tie-break + gender ordering, nothing
  // else), which lets TreePersonClientPayload (a narrower, client-safe
  // subset — see its own doc comment) satisfy this too, without widening it
  // all the way to `unknown`.
  persons: Pick<PersonRecord, "id" | "firstName" | "lastName" | "gender">[];
  parentChildEdges: Pick<ParentChildRecord, "id" | "parentId" | "childId">[];
  partnershipEdges: Pick<
    PartnershipRecord,
    "id" | "person1Id" | "person2Id" | "status" | "isCurrent"
  >[];
}

/**
 * The exact subset of PersonRecord this module actually reads (toTreeFamilyGraph
 * + fromTreeLayout, combined) — see rewrite plan §7 Stage 7 (client-side
 * focus-switch re-layout, §3.4). Deliberately narrower than PersonRecord:
 * this shape crosses the server/client boundary as a plain prop (the tree
 * page hands it to a Client Component so re-focusing can re-run
 * buildTreeLayout locally instead of a full page reload), so it must never
 * carry privacy-sensitive or simply unneeded fields (createdBy, familyId,
 * privacyLevel, middleName, maidenName, birthPlaceId, deathPlaceId,
 * deathCause, description) into client JS, and must stay plain-JSON-safe
 * (no Date — createdAt is intentionally omitted too, since orderingKeyByPersonId
 * isn't consumed by shouldBeLeft yet, see FamilyGraph's own doc comment).
 */
export type TreePersonClientPayload = Pick<
  PersonRecord,
  | "id"
  | "slug"
  | "firstName"
  | "lastName"
  | "nickname"
  | "gender"
  | "isPlaceholder"
  | "isLiving"
  | "birthDate"
  | "deathDate"
  | "photoMediaId"
  | "religion"
  | "nationality"
>;

/**
 * Everything a Client Component needs to re-run buildTreeLayout + fromTreeLayout
 * locally (rewrite plan §7 Stage 7) without touching the database again —
 * built once server-side (see tree.service.ts::getRawTreeGraph) from the
 * SAME rows getFocusTreeLayout already fetches, so the two never drift out
 * of sync with each other.
 */
export interface TreeClientGraphPayload {
  persons: TreePersonClientPayload[];
  parentChildEdges: Pick<ParentChildRecord, "id" | "parentId" | "childId">[];
  partnershipEdges: Pick<
    PartnershipRecord,
    "id" | "person1Id" | "person2Id" | "status" | "isCurrent"
  >[];
}

/**
 * Rebuilds a TreeLayoutGraph entirely client-side, for a NEW focus person,
 * against an already-fetched TreeClientGraphPayload — the client-side
 * counterpart to getFocusTreeLayout (tree.service.ts), used by TreeCanvas's
 * own focus-switch handler (rewrite plan §7 Stage 7) instead of a full page
 * navigation. No React/Next import here (this file already has none), so
 * it's safe to call directly from a "use client" component.
 */
export function buildClientTreeLayout(
  payload: TreeClientGraphPayload,
  focusPersonId: string,
): TreeLayoutGraph {
  const personById = new Map(payload.persons.map((p) => [p.id, p]));

  const { graph } = toTreeFamilyGraph({
    persons: payload.persons,
    parentChildEdges: payload.parentChildEdges,
    partnershipEdges: payload.partnershipEdges,
  });

  const result = buildTreeLayout(graph, focusPersonId);

  const partnershipIsCurrentById = new Map(
    payload.partnershipEdges.map((r) => [r.id, r.isCurrent]),
  );
  return fromTreeLayout(
    focusPersonId,
    result,
    personById,
    payload.parentChildEdges,
    partnershipIsCurrentById,
  );
}

/**
 * Converts DB-shaped records into the layout engine's FamilyGraph, plus a
 * lookup Map back to the original PersonRecord — the engine's own Person
 * only carries id/firstName/lastName/gender, so everything else
 * LayoutNode.person needs (slug, photo, nickname, religion, ...) must be
 * joined back by id afterward, not threaded through the engine itself.
 */
export function toTreeFamilyGraph<
  TPerson extends TreeAdapterInput["persons"][number],
>(input: TreeAdapterInput & { persons: TPerson[] }): {
  graph: FamilyGraph;
  personById: Map<string, TPerson>;
} {
  // Provably safe despite the cast: `personById` is built directly from
  // `input.persons: TPerson[]` one line below, with no transformation of the
  // person objects themselves (only keyed by their own id) — TypeScript's
  // generic variance rules can't express "this Map<string, TPerson> was
  // literally built from a TPerson[]" on their own, hence the assertion.
  const personById = new Map(
    input.persons.map((p) => [p.id, p]),
  ) as Map<string, TPerson>;

  const persons: EngineePerson[] = input.persons.map((p) => ({
    id: p.id,
    // The engine requires non-null strings but never renders them — it only
    // reads them for shouldBeLeft's id tie-break (not name comparison), so
    // "" is inert here.
    firstName: p.firstName ?? "",
    lastName: p.lastName ?? "",
    gender: p.gender,
  }));

  // DB ids are UUIDs from disjoint Drizzle tables (persons/parentChild/
  // partnership never collide with each other in this schema) — pass them
  // straight through as Relationship.id, so a partnership's id here matches
  // its original PartnershipRecord.id one-to-one (used by
  // partnershipIsCurrentById in fromTreeLayout below).
  const relationships: EngineRelationship[] = [
    ...input.parentChildEdges.map((e) => ({
      id: e.id,
      kind: "parent-child" as const,
      from: e.parentId,
      to: e.childId,
    })),
    ...input.partnershipEdges.map((e) => ({
      id: e.id,
      kind: "spouse" as const,
      from: e.person1Id,
      to: e.person2Id,
      status: toEngineStatus(e.status, e.isCurrent),
    })),
  ];

  return { graph: { persons, relationships }, personById };
}

// Layout engine's own card/spacing constants (src/domain/tree/layout/subtree.ts).
const ENGINE_CARD_WIDTH = 176;
const ENGINE_SPOUSE_GAP = 32;
const ENGINE_GENERATION_GAP = 240; // CARD_HEIGHT (176) + 64

// Production's own card geometry — MUST track
// components/tree/adapters/xyflow-adapter.ts's COMPACT_X_SPACING/
// COMPACT_Y_SPACING (that file doesn't export them, so keep these two pairs
// of constants in sync by hand if either side ever changes).
const PROD_PARTNER_X_SPACING = 184; // xyflow-adapter.ts COMPACT_X_SPACING
const PROD_GENERATION_Y_SPACING = 230; // xyflow-adapter.ts COMPACT_Y_SPACING

const ENGINE_PARTNER_X_SPACING = ENGINE_CARD_WIDTH + ENGINE_SPOUSE_GAP; // 208

/**
 * Uniform per-axis rescale from the engine's own coordinate space (tuned for
 * its 176x176 cards) to production's coordinate space (160x200 compact
 * cards, as of the round-avatar compact redesign — previously 220x88). A
 * uniform scale preserves every pairwise distance proportionally, so the
 * engine's collision-free guarantee survives the rescale: X_SCALE maps the
 * engine's tightest legal horizontal gap (direct partners, 208px) onto
 * production's tightest gap (184px, built for a 160px compact card) —
 * 208*0.885=184 >= 160, with 24px of clearance. Every wider engine gap
 * (siblings, unrelated units) scales to something even wider than 160px.
 * Y_SCALE shrinks the engine's taller vertical rhythm (240px, built for its
 * 176px-tall cards) down to production's 230px — production's compact card
 * is 200px tall (large round avatar + name/years), so 30px of clearance
 * remains.
 */
const X_SCALE = PROD_PARTNER_X_SPACING / ENGINE_PARTNER_X_SPACING; // 0.885
const Y_SCALE = PROD_GENERATION_Y_SPACING / ENGINE_GENERATION_GAP; // 0.958

/**
 * Converts the layout engine's TreeLayoutResult back into the shared
 * TreeLayoutGraph contract (tree-layout.builder.ts) — unchanged downstream
 * of this point: tree-filter.ts, tree-trace.ts, and
 * components/tree/adapters/xyflow-adapter.ts all consume TreeLayoutGraph
 * without needing to know a different engine produced it.
 */
export function fromTreeLayout(
  focusPersonId: string,
  result: TreeLayoutResult,
  personById: Map<string, TreePersonClientPayload>,
  parentChildEdgesInput: Pick<ParentChildRecord, "parentId" | "childId">[],
  partnershipIsCurrentById: Map<string, boolean>,
): TreeLayoutGraph {
  const nodes: LayoutNode[] = result.persons.map((p) => {
    const record = personById.get(p.id);
    if (!record) {
      throw new Error(
        `fromTreeLayout: person "${p.id}" missing from personById map (adapter bug)`,
      );
    }
    const person: PersonNode = {
      id: record.id,
      slug: record.slug,
      firstName: record.firstName,
      lastName: record.lastName,
      nickname: record.nickname,
      isPlaceholder: record.isPlaceholder,
      isLiving: record.isLiving,
      birthYear: record.birthDate?.year ?? null,
      deathYear: record.deathDate?.year ?? null,
      photoMediaId: record.photoMediaId,
      gender: record.gender,
      religion: record.religion,
      nationality: record.nationality,
    };
    return {
      id: p.id,
      kind: "person",
      personId: p.id,
      x: p.x * X_SCALE,
      y: p.y * Y_SCALE,
      // 0-at-focus BFS distance — same semantics person-node.tsx's
      // generationColor() already expects.
      generation: p.generation,
      isFocus: p.id === focusPersonId,
      person,
    };
  });

  // Flat parent_child edges built straight from DB rows — NOT the engine's
  // own junction/partnership model — so xyflow-adapter.ts's existing
  // findUnionParentPairs keeps doing union-trunk collapsing exactly as it
  // does today, unaware the coordinates underneath changed.
  const parentChildLayoutEdges: LayoutEdge[] = parentChildEdgesInput
    .filter((e) => personById.has(e.parentId) && personById.has(e.childId))
    .map((e) => ({
      id: `pc-${e.parentId}-${e.childId}`,
      kind: "parent_child",
      source: e.parentId,
      target: e.childId,
    }));

  const partnershipLayoutEdges: LayoutEdge[] = result.partnerships.map((p) => ({
    id: `partner-${p.leftPersonId}-${p.rightPersonId}`,
    kind: "partnership",
    source: p.leftPersonId,
    target: p.rightPersonId,
    // Preserved losslessly from the original DB row — NOT derived from
    // the engine's coerced 4-value status (toEngineStatus above), which
    // cannot distinguish "married, no longer current" from "married,
    // current" and would silently corrupt RelationshipEdge's rendered
    // line style (solid vs dashed).
    isCurrent: partnershipIsCurrentById.get(p.id) ?? true,
  }));

  return {
    nodes,
    edges: [...parentChildLayoutEdges, ...partnershipLayoutEdges],
    focusPersonId,
  };
}
