import { MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDemoFamily } from "@/components/marketing/shared/use-demo-family";
import type { DemoPersonId } from "@/components/marketing/shared/hartley-family";
import { LANDING_PHOTOS } from "@/components/marketing/shared/landing-photos";
import {
  roundedOrthogonalPath,
  type Point,
} from "@/components/tree/orthogonal-path";
import { FRAME_SIZE } from "@/components/tree/card-dimensions";
import { TREE_NODE_HEIGHT, TREE_NODE_WIDTH, TreeCard } from "../tree-card";

/** Card centres in the tree's own spacing (see tree-panel.tsx): partners
 *  208 apart, siblings 240, generations 240. */
const ROW_TOP = [0, 240, 480];
const PEOPLE: readonly { id: DemoPersonId; x: number; row: number }[] = [
  { id: "ivan", x: 104, row: 0 },
  { id: "vera", x: 312, row: 0 },
  { id: "paul", x: 88, row: 1 },
  { id: "margaret", x: 328, row: 1 },
  { id: "david", x: 536, row: 1 },
  { id: "owen", x: 432, row: 2 },
];
const COUPLES = [
  { a: 104, b: 312, row: 0 },
  { a: 328, b: 536, row: 1 },
] as const;
export const KINSHIP_TREE_WIDTH = 616;
export const KINSHIP_TREE_HEIGHT = ROW_TOP[2] + TREE_NODE_HEIGHT;

const CENTER_Y = FRAME_SIZE / 2;
const RADIUS = FRAME_SIZE / 2;
const CHILD_TAIL = 56;
const PHOTOS: Partial<Record<DemoPersonId, string>> = {
  ivan: LANDING_PHOTOS.ivanPortrait.src,
  vera: LANDING_PHOTOS.veraPortrait.src,
};

/** A union trunk from the couple's midpoint to a child (union-child-
 *  edge.tsx); a traced one starts at the traced parent's frame edge. */
function unionChild(
  couple: (typeof COUPLES)[number],
  child: number,
  tracedFrom?: number,
): string {
  const mid = (couple.a + couple.b) / 2;
  const y = ROW_TOP[couple.row] + CENTER_Y;
  const clearY = ROW_TOP[couple.row] + TREE_NODE_HEIGHT;
  const targetY = ROW_TOP[couple.row + 1];
  const midY = Math.max(clearY, targetY - CHILD_TAIL);
  const points: Point[] = [
    { x: mid, y },
    { x: mid, y: clearY },
    { x: mid, y: midY },
    { x: child, y: midY },
    { x: child, y: targetY },
  ];
  return roundedOrthogonalPath(
    tracedFrom === undefined
      ? points
      : [
          { x: tracedFrom + Math.sign(mid - tracedFrom) * RADIUS, y },
          ...points,
        ],
  );
}

/**
 * The stretch of the tree the trace runs through, drawn as the tree draws
 * a Relationship Trace: cards on the path framed in terracotta, everyone
 * else at 35% (person-node.tsx's isDimmed), the path's lines as marching
 * terracotta dashes over a canvas-colored backdrop (TracedLine), and the
 * «−» collapse badge on each couple's line.
 */
export function KinshipTree({ path }: { path: readonly DemoPersonId[] }) {
  const family = useDemoFamily();
  const onPath = new Set(path);
  const [elders, parents] = COUPLES;
  const plain = [
    ...COUPLES.map(
      ({ a, b, row }) =>
        `M${a + RADIUS} ${ROW_TOP[row] + CENTER_Y}H${b - RADIUS}`,
    ),
    unionChild(elders, 88),
    unionChild(elders, 328),
    unionChild(parents, 432),
  ];
  const traced = [
    unionChild(elders, 88, elders.a),
    unionChild(elders, 328, elders.a),
    unionChild(parents, 432, parents.a),
  ];
  return (
    <div
      className="relative"
      style={{ width: KINSHIP_TREE_WIDTH, height: KINSHIP_TREE_HEIGHT }}
    >
      <svg
        viewBox={`0 0 ${KINSHIP_TREE_WIDTH} ${KINSHIP_TREE_HEIGHT}`}
        className="absolute inset-0 size-full overflow-visible"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {plain.map((d) => (
          <path key={d} d={d} stroke="var(--branch)" strokeWidth={1.5} />
        ))}
        {traced.map((d) => (
          <g key={d}>
            <path d={d} stroke="var(--tree-canvas)" strokeWidth={9} />
            <path
              d={d}
              stroke="var(--primary)"
              strokeWidth={3}
              className="animate-tree-trace-march-forward"
            />
          </g>
        ))}
      </svg>
      {COUPLES.map(({ a, b, row }) => (
        <span
          key={a}
          className="absolute flex h-5 min-w-5 -translate-1/2 items-center justify-center rounded-full border border-border bg-card px-1.5 text-muted-foreground shadow-sm"
          style={{ left: (a + b) / 2, top: ROW_TOP[row] + CENTER_Y }}
        >
          <MinusIcon className="size-3" />
        </span>
      ))}
      {PEOPLE.map(({ id, x, row }) => (
        <div
          key={id}
          className={cn("absolute", !onPath.has(id) && "opacity-35")}
          style={{ left: x - TREE_NODE_WIDTH / 2, top: ROW_TOP[row] }}
        >
          <TreeCard
            name={family[id].name}
            years={family[id].years}
            photo={PHOTOS[id]}
            active={onPath.has(id)}
          />
        </div>
      ))}
    </div>
  );
}
