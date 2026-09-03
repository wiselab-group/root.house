import { BaseEdge, type EdgeProps } from "@xyflow/react";

/**
 * tree-v3 — пунктирная горизонтальная линия между супругами (dashed —
 * сплошная линия означает parent→child descent, пунктир — партнёрство/союз,
 * тот же язык, что в tree-v2/боевом дереве).
 *
 * Координаты идут через data.leftX/leftY/rightX/rightY (посчитаны в
 * tree-canvas.tsx от внутренних краёв карточек, из тех же координат, что и
 * позиции самих узлов) — не из sourceX/targetX от xyflow: те считаются от
 * CSS-позиции handle'а, который у невидимых (opacity-0) default-handles
 * сидит на несколько px внутрь от реальной границы карточки.
 */
export function PartnershipEdge({ data }: EdgeProps) {
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
