/**
 * Строит SVG path через последовательность точек на прямых линиях (каждая
 * соседняя пара делит либо x, либо y), скругляя каждый внутренний угол
 * маленькой квадратичной кривой вместо острого 90°. Копия геометрии из
 * src/components/tree/orthogonal-path.ts — не импортируется оттуда напрямую,
 * чтобы tree-v2 оставался полностью независимой песочницей (см. диалог: не
 * трогаем старый /tree код), но сама форма линий должна читаться как один
 * консистентный "семейный" стиль — та же кривизна углов.
 */
export interface Point {
  x: number;
  y: number;
}

const CORNER_RADIUS = 8;

export function roundedOrthogonalPath(points: Point[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  }

  let d = `M${points[0].x},${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const corner = points[i];
    const next = points[i + 1];

    // Радиус не может превышать половину длины любого соседнего сегмента —
    // иначе кривая "перелетит" за угол (или за предыдущий на очень
    // коротком сегменте) — clamp до того, что реально помещается.
    const inLength = Math.hypot(corner.x - prev.x, corner.y - prev.y);
    const outLength = Math.hypot(next.x - corner.x, next.y - corner.y);
    const radius = Math.min(CORNER_RADIUS, inLength / 2, outLength / 2);

    const inStart = pointToward(corner, prev, radius);
    const outEnd = pointToward(corner, next, radius);

    d += ` L${inStart.x},${inStart.y} Q${corner.x},${corner.y} ${outEnd.x},${outEnd.y}`;
  }

  const last = points[points.length - 1];
  d += ` L${last.x},${last.y}`;
  return d;
}

/** Точка на расстоянии `distance` от `from`, по направлению к `to`. */
function pointToward(from: Point, to: Point, distance: number): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length === 0) return from;
  const t = distance / length;
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}
