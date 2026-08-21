import { sql } from "drizzle-orm";
import { db } from "@/db/client";

const DEFAULT_MAX_DEPTH = 25; // generous — protects against pathological/cyclical data, not a real limit

/**
 * All ancestor person ids of `personId` (parents, grandparents, ...), found
 * via a recursive CTE over relationships_parent_child. Indexed on childId,
 * so this stays fast even as a family's tree grows into the thousands.
 * `maxDepth` guards against runaway recursion on malformed data.
 */
export async function getAncestorIds(
  personId: string,
  familyId: string,
  maxDepth = DEFAULT_MAX_DEPTH,
): Promise<string[]> {
  const result = await db.execute<{ parent_id: string }>(sql`
    WITH RECURSIVE ancestors AS (
      SELECT parent_id, child_id, 1 AS depth
      FROM relationships_parent_child
      WHERE child_id = ${personId} AND family_id = ${familyId}
      UNION ALL
      SELECT pc.parent_id, pc.child_id, a.depth + 1
      FROM relationships_parent_child pc
      JOIN ancestors a ON pc.child_id = a.parent_id
      WHERE a.depth < ${maxDepth} AND pc.family_id = ${familyId}
    )
    SELECT DISTINCT parent_id FROM ancestors
  `);
  return result.rows.map((row) => row.parent_id);
}

/** Mirror of getAncestorIds: all descendant person ids (children, grandchildren, ...). */
export async function getDescendantIds(
  personId: string,
  familyId: string,
  maxDepth = DEFAULT_MAX_DEPTH,
): Promise<string[]> {
  const result = await db.execute<{ child_id: string }>(sql`
    WITH RECURSIVE descendants AS (
      SELECT parent_id, child_id, 1 AS depth
      FROM relationships_parent_child
      WHERE parent_id = ${personId} AND family_id = ${familyId}
      UNION ALL
      SELECT pc.parent_id, pc.child_id, d.depth + 1
      FROM relationships_parent_child pc
      JOIN descendants d ON pc.parent_id = d.child_id
      WHERE d.depth < ${maxDepth} AND pc.family_id = ${familyId}
    )
    SELECT DISTINCT child_id FROM descendants
  `);
  return result.rows.map((row) => row.child_id);
}

/**
 * Ancestor ids together with their depth (1 = direct parent, 2 = grandparent, ...).
 * Used by computeRelationshipPath to find the lowest common ancestor and its
 * distance from each side.
 */
export async function getAncestorDepths(
  personId: string,
  familyId: string,
  maxDepth = DEFAULT_MAX_DEPTH,
): Promise<Map<string, number>> {
  const result = await db.execute<{ parent_id: string; depth: number }>(sql`
    WITH RECURSIVE ancestors AS (
      SELECT parent_id, child_id, 1 AS depth
      FROM relationships_parent_child
      WHERE child_id = ${personId} AND family_id = ${familyId}
      UNION ALL
      SELECT pc.parent_id, pc.child_id, a.depth + 1
      FROM relationships_parent_child pc
      JOIN ancestors a ON pc.child_id = a.parent_id
      WHERE a.depth < ${maxDepth} AND pc.family_id = ${familyId}
    )
    SELECT parent_id, MIN(depth) AS depth FROM ancestors GROUP BY parent_id
  `);

  const depths = new Map<string, number>();
  for (const row of result.rows) {
    depths.set(row.parent_id, Number(row.depth));
  }
  return depths;
}

/**
 * true if `candidateAncestorId` is already an ancestor of `personId` — used
 * by relationship.service.ts to reject a parent_child insert that would
 * create a cycle (e.g. making someone their own ancestor).
 */
export async function isAncestorOf(
  candidateAncestorId: string,
  personId: string,
  familyId: string,
): Promise<boolean> {
  const ancestorIds = await getAncestorIds(personId, familyId);
  return ancestorIds.includes(candidateAncestorId);
}
