/**
 * Pure sibling-derivation algorithm — no database access, so it's unit-testable
 * against a plain array of parent_child edges. Siblings are never stored;
 * two people are siblings iff they share at least one parent.
 */
export interface ParentChildEdge {
  parentId: string;
  childId: string;
}

/**
 * Returns the ids of everyone who shares at least one parent with `personId`
 * (excluding `personId` itself), given the full set of parent_child edges for
 * a family. Also returns, per sibling, how many parents are shared — 2 shared
 * parents means a full sibling, 1 means a half-sibling.
 */
export function deriveSiblings(
  personId: string,
  edges: ParentChildEdge[],
): Array<{ personId: string; sharedParentCount: number }> {
  const parentsOfPerson = edges
    .filter((e) => e.childId === personId)
    .map((e) => e.parentId);
  if (parentsOfPerson.length === 0) return [];

  const sharedParentCountByChild = new Map<string, number>();
  for (const parentId of parentsOfPerson) {
    const childrenOfThisParent = edges
      .filter((e) => e.parentId === parentId)
      .map((e) => e.childId);
    for (const childId of childrenOfThisParent) {
      if (childId === personId) continue;
      sharedParentCountByChild.set(
        childId,
        (sharedParentCountByChild.get(childId) ?? 0) + 1,
      );
    }
  }

  return [...sharedParentCountByChild.entries()].map(
    ([id, sharedParentCount]) => ({
      personId: id,
      sharedParentCount,
    }),
  );
}
