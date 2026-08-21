/**
 * computeRelationshipPath — "how are Person A and Person B related?"
 *
 * Pure algorithm over two ancestor-depth maps (depth 1 = direct parent, 2 =
 * grandparent, ...), so it's unit-testable without touching the database —
 * the DB-backed wrapper (computeRelationshipPathFor) just calls
 * getAncestorDepths() for both people and hands the maps here.
 *
 * Approach: find the lowest common ancestor(s) — the shared ancestor with
 * the smallest combined depth — then translate (depthA, depthB) into a
 * relationship label via the standard genealogical cousin/removal formula.
 * Not in the MVP UI yet, but the domain layer is ready for it.
 */

export type BloodRelationLabel =
  | "same person"
  | "parent"
  | "child"
  | "sibling"
  | "grandparent"
  | "grandchild"
  | "aunt_or_uncle"
  | "niece_or_nephew"
  | "cousin"
  | "unrelated";

export interface RelationshipPathResult {
  label: BloodRelationLabel;
  /** For cousins: 1 = first cousin, 2 = second cousin, etc. Undefined otherwise. */
  cousinDegree?: number;
  /** For cousins: how many generations removed. 0 = same generation. Undefined otherwise. */
  removed?: number;
  /** Person id of the lowest common ancestor, or null if none was found (unrelated). */
  commonAncestorId: string | null;
}

/**
 * `ancestorsA`/`ancestorsB`: Map<personId, depth> as returned by
 * getAncestorDepths() for person A and person B respectively (depth 1 =
 * direct parent). Does NOT include the person themselves — depth 0 self
 * entries are handled by the personAId === personBId short-circuit below.
 */
export function computeRelationshipPath(
  personAId: string,
  personBId: string,
  ancestorsA: Map<string, number>,
  ancestorsB: Map<string, number>,
): RelationshipPathResult {
  if (personAId === personBId) {
    return { label: "same person", commonAncestorId: personAId };
  }

  // A is an ancestor of B (e.g. A is B's parent/grandparent).
  const aAsAncestorDepth = ancestorsB.get(personAId);
  if (aAsAncestorDepth !== undefined) {
    return {
      label: labelForDirectLineage(aAsAncestorDepth),
      commonAncestorId: personAId,
      // depth 1 = parent (no "removed" concept); depth >= 2 = grandparent
      // and beyond, where "removed" counts generations past grandparent.
      ...(aAsAncestorDepth >= 2 ? { removed: aAsAncestorDepth - 1 } : {}),
    };
  }

  // B is an ancestor of A.
  const bAsAncestorDepth = ancestorsA.get(personBId);
  if (bAsAncestorDepth !== undefined) {
    return {
      label: reverseDirectLineageLabel(labelForDirectLineage(bAsAncestorDepth)),
      commonAncestorId: personBId,
      ...(bAsAncestorDepth >= 2 ? { removed: bAsAncestorDepth - 1 } : {}),
    };
  }

  // Find the lowest common ancestor: shared ancestor with the smallest
  // combined depth (depthA + depthB) — ties are broken by picking any,
  // since combined depth is what determines the relationship label anyway.
  let bestCommonAncestor: string | null = null;
  let bestDepthA = Infinity;
  let bestDepthB = Infinity;

  for (const [ancestorId, depthA] of ancestorsA) {
    const depthB = ancestorsB.get(ancestorId);
    if (depthB === undefined) continue;
    if (depthA + depthB < bestDepthA + bestDepthB) {
      bestCommonAncestor = ancestorId;
      bestDepthA = depthA;
      bestDepthB = depthB;
    }
  }

  if (bestCommonAncestor === null) {
    return { label: "unrelated", commonAncestorId: null };
  }

  return {
    ...labelForCollateralRelation(bestDepthA, bestDepthB),
    commonAncestorId: bestCommonAncestor,
  };
}

function labelForDirectLineage(depth: number): BloodRelationLabel {
  if (depth === 1) return "parent";
  return "grandparent"; // depth >= 2 — "great-" prefixes are a UI-string concern, not this label's job
}

function reverseDirectLineageLabel(label: BloodRelationLabel): BloodRelationLabel {
  if (label === "parent") return "child";
  if (label === "grandparent") return "grandchild";
  return label;
}

/**
 * Standard genealogical cousin/removal formula from two depths to a common
 * ancestor. Siblings (1,1), aunt/uncle (1,2 or 2,1), and Nth cousins /
 * M-times-removed all fall out of the same (min(depthA,depthB), |depthA-depthB|) shape.
 */
function labelForCollateralRelation(
  depthA: number,
  depthB: number,
): { label: BloodRelationLabel; cousinDegree?: number; removed?: number } {
  const minDepth = Math.min(depthA, depthB);
  const removed = Math.abs(depthA - depthB);

  if (minDepth === 1 && removed === 0) {
    return { label: "sibling" };
  }

  if (minDepth === 1 && removed > 0) {
    // One side is a direct sibling-line descendant one extra generation down
    // from the common ancestor while the other is not — this is the
    // aunt/uncle <-> niece/nephew relationship (or "great-" variants, a UI concern).
    return depthA < depthB ? { label: "aunt_or_uncle", removed } : { label: "niece_or_nephew", removed };
  }

  // Both at least 2 generations from the common ancestor: cousins.
  // cousinDegree = minDepth - 1 (1st cousins share grandparents => minDepth 2).
  return { label: "cousin", cousinDegree: minDepth - 1, removed };
}
