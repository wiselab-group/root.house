import { BaseEdge, type EdgeProps } from "@xyflow/react";

/**
 * tree-v2 — пунктирная горизонтальная линия между супругами (dashed, как
 * в боевом дереве — см. src/components/tree/relationship-edge.tsx: сплошная
 * линия означает descent parent→child, пунктир — партнёрство/союз).
 *
 * Координаты идут через data.leftX/leftY/rightX/rightY (посчитаны в
 * tree-canvas.tsx от внутренних краёв карточек — тех же center-координат,
 * что и позиции самих узлов), а не из sourceX/targetX от xyflow: те считаются
 * от CSS-позиции handle'а, который у невидимых (opacity-0) default-handles
 * сидит на 3px внутрь от реальной границы карточки.
 */
export function SpouseEdge({ data }: EdgeProps) {
  const leftX = typeof data?.leftX === "number" ? data.leftX : 0;
  const leftY = typeof data?.leftY === "number" ? data.leftY : 0;
  const rightX = typeof data?.rightX === "number" ? data.rightX : leftX;
  const rightY = typeof data?.rightY === "number" ? data.rightY : leftY;

  return (
    <BaseEdge
      path={`M${leftX},${leftY} L${rightX},${rightY}`}
      className="stroke-muted-foreground"
      style={{ strokeWidth: 1.5, strokeDasharray: "5 3" }}
    />
  );
}
