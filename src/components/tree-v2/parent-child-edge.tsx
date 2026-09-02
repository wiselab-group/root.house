import { BaseEdge, type EdgeProps } from "@xyflow/react";
import { CARD_HALF_SIZE } from "./card-geometry";
import { roundedOrthogonalPath, type Point } from "./orthogonal-path";

/** Отступ вниз от нижнего края родительских карточек до горизонтального сегмента гребня. */
const TRUNK_CLEARANCE = 16;

/**
 * tree-v2 — трункул от союза родителей вниз к ребёнку: down → across →
 * down, со скруглёнными углами — тот же визуальный язык, что у боевого
 * union-child-edge.tsx (см. src/components/tree/union-child-edge.tsx), но
 * не импортируется оттуда: tree-v2 — независимая песочница.
 *
 * Начинается от unionY БЕЗ смещения вниз (та же высота, что и центр
 * родительских карточек — та же Y, на которой SpouseEdge рисует пунктирную
 * линию партнёрства) — так первый вертикальный сегмент проходит "сквозь"
 * карточку визуально одной линией с пунктиром, без видимого разрыва между
 * ними (см. историю: раньше трункул стартовал ниже, у нижнего края карточек,
 * оставляя половину карточки без линии).
 *
 * Горизонтальный сегмент гребня (midY) — ФИКСИРОВАННЫЙ отступ
 * (TRUNK_CLEARANCE) от нижнего края родительских карточек, а не "середина
 * между родителями и ребёнком": при нескольких далеко раздвинутых детях
 * "рога" гребня тянутся далеко по X под соседние карточки того же
 * поколения — если бы midY плавал в зависимости от того, как далеко стоит
 * ребёнок (GENERATION_GAP_Y иногда даёт мало места), гребень мог оказаться
 * даже ВЫШЕ нижнего края родительских карточек и визуально "нырять" под
 * них сбоку. Фиксированный небольшой отступ гарантирует, что гребень всегда
 * ниже родителей, независимо от того, насколько широко раскинуты дети.
 *
 * childX/childY/unionX/unionY идут через data (посчитаны в tree-canvas.tsx
 * из тех же center-координат, что и позиции самих узлов), а не из
 * sourceX/sourceY/targetX/targetY от xyflow: те считаются от CSS-позиции
 * handle'а, а невидимый (opacity-0) default-handle сидит на 3px внутрь от
 * реальной границы карточки.
 */
export function ParentChildEdge({ data }: EdgeProps) {
  const unionX = typeof data?.unionX === "number" ? data.unionX : 0;
  const unionY = typeof data?.unionY === "number" ? data.unionY : 0;
  const childX = typeof data?.childX === "number" ? data.childX : unionX;
  const childY = typeof data?.childY === "number" ? data.childY : unionY;

  const endY = childY - CARD_HALF_SIZE;
  const midY = unionY + CARD_HALF_SIZE + TRUNK_CLEARANCE;

  const points: Point[] = [
    { x: unionX, y: unionY },
    { x: unionX, y: midY },
    { x: childX, y: midY },
    { x: childX, y: endY },
  ];

  return (
    <BaseEdge
      path={roundedOrthogonalPath(points)}
      className="stroke-border"
      style={{ strokeWidth: 2 }}
    />
  );
}
