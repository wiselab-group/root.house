import { BaseEdge, type EdgeProps } from "@xyflow/react";
import { CARD_HALF_HEIGHT } from "./card-geometry";
import { roundedOrthogonalPath, type Point } from "./orthogonal-path";

/** Отступ вниз от нижнего края родительских карточек (или от Y партнёрского junction'а — если родители физически далеко друг от друга, §7/§8 diverging fork) до горизонтального сегмента гребня. */
const TRUNK_CLEARANCE = 16;

/**
 * tree-v3 — трункул от union (partnership junction, либо позиция solo-
 * родителя) вниз к ребёнку: down → across → down, со скруглёнными углами
 * (§33: orthogonal routing, minimal crossings) — тот же визуальный язык, что
 * у tree-v2/боевого union-child-edge.
 *
 * unionX/unionY/childX/childY идут через data (посчитаны в edges.ts из тех
 * же center-координат, что и позиции самих узлов, а не из sourceX/targetX от
 * xyflow — см. комментарий в person-node.tsx).
 */
export function ParentChildEdge({ data }: EdgeProps) {
  const unionX = typeof data?.unionX === "number" ? data.unionX : 0;
  const unionY = typeof data?.unionY === "number" ? data.unionY : 0;
  const childX = typeof data?.childX === "number" ? data.childX : unionX;
  const childY = typeof data?.childY === "number" ? data.childY : unionY;

  const endY = childY - CARD_HALF_HEIGHT;
  const midY = unionY + CARD_HALF_HEIGHT + TRUNK_CLEARANCE;

  const points: Point[] = [
    { x: unionX, y: unionY },
    { x: unionX, y: midY },
    { x: childX, y: midY },
    { x: childX, y: endY },
  ];

  return <BaseEdge path={roundedOrthogonalPath(points)} className="stroke-border" style={{ strokeWidth: 2 }} />;
}
