import { useDemoFamily } from "@/components/marketing/shared/use-demo-family";
import type { DemoPersonId } from "@/components/marketing/shared/hartley-family";
import { LANDING_PHOTOS } from "@/components/marketing/shared/landing-photos";
import { ScaledCanvas } from "@/components/marketing/shared/scaled-canvas";
import {
  roundedOrthogonalPath,
  type Point,
} from "@/components/tree/orthogonal-path";
import { FRAME_SIZE } from "@/components/tree/card-dimensions";
import { PanelFrame } from "./panel-frame";
import { TREE_NODE_HEIGHT, TREE_NODE_WIDTH, TreeCard } from "./tree-card";
import { TreePopover } from "./tree-popover";

/**
 * Card centres and rows in the tree's own spacing (domain/tree/layout/
 * subtree.ts): partners 208px apart centre to centre (card slot 176 +
 * SPOUSE_GAP 32), siblings 240 (+ SIBLING_GAP 64), generations 240 apart.
 */
const ROW_TOP = [24, 264, 504];
const PEOPLE: readonly { id: DemoPersonId; x: number; row: number }[] = [
  { id: "ivan", x: 144, row: 0 },
  { id: "vera", x: 352, row: 0 },
  { id: "paul", x: 128, row: 1 },
  { id: "margaret", x: 368, row: 1 },
  { id: "david", x: 576, row: 1 },
  { id: "owen", x: 352, row: 2 },
  { id: "lily", x: 592, row: 2 },
];
const PHOTOS: Partial<Record<DemoPersonId, string>> = {
  ivan: LANDING_PHOTOS.ivanPortrait.src,
  vera: LANDING_PHOTOS.veraPortrait.src,
};
const WIDTH = 720;
/** Vera's card, clicked open: her popover sits beside it (side="right",
 *  sideOffset 12), held inside the canvas as the app's `sticky` holds it
 *  inside the visible tree. */
const OPEN: DemoPersonId = "vera";
const POPOVER_LEFT = 352 + TREE_NODE_WIDTH / 2 + 12;
const POPOVER_TOP = 16;
/** 4:3, so it fills the panel and reads larger: a tree viewport, the
 *  grandchildren running off its bottom edge as they would on screen. */
const HEIGHT = 540;

/** Frame-centre height, the partnership line's y (CONNECTOR_CENTER_Y). */
const CENTER_Y = FRAME_SIZE / 2;
/** The last straight drop into a child (relationship-edge.tsx
 *  COMPACT_CHILD_TAIL_LENGTH). */
const CHILD_TAIL = 56;

/** A partnership line between two frames, pulled back by the avatar
 *  radius so it meets each frame's edge (PartnershipEdgeLine). */
function partnership(a: number, b: number, row: number): string {
  const y = ROW_TOP[row] + CENTER_Y;
  return `M${a + FRAME_SIZE / 2} ${y}H${b - FRAME_SIZE / 2}`;
}

/** A union trunk from the middle of the couple's line down to a child,
 *  routed and rounded exactly like union-child-edge.tsx. */
function unionChild(a: number, b: number, row: number, child: number) {
  const source: Point = { x: (a + b) / 2, y: ROW_TOP[row] + CENTER_Y };
  const clearY = ROW_TOP[row] + TREE_NODE_HEIGHT;
  const targetY = ROW_TOP[row + 1];
  const midY = Math.max(clearY, targetY - CHILD_TAIL);
  return roundedOrthogonalPath([
    source,
    { x: source.x, y: clearY },
    { x: source.x, y: midY },
    { x: child, y: midY },
    { x: child, y: targetY },
  ]);
}

const EDGES = [
  partnership(144, 352, 0),
  unionChild(144, 352, 0, 128),
  unionChild(144, 352, 0, 368),
  partnership(368, 576, 1),
  unionChild(368, 576, 1, 352),
  unionChild(368, 576, 1, 592),
];

/** The family tree screen in miniature — its card, its spacing, its
 *  rounded orthogonal connectors in --branch at 1.5px — at real size,
 *  scaled to the panel, with one card clicked open: its frame terracotta
 *  (CompactCardBody's isOpen) and its popover beside it. */
export function TreePanel() {
  const family = useDemoFamily();
  return (
    <PanelFrame className="bg-tree-canvas p-0">
      <ScaledCanvas width={WIDTH} height={HEIGHT}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="absolute inset-0 size-full"
        >
          {EDGES.map((d) => (
            <path
              key={d}
              d={d}
              fill="none"
              stroke="var(--branch)"
              strokeWidth={1.5}
            />
          ))}
        </svg>
        {PEOPLE.map(({ id, x, row }) => (
          <div
            key={id}
            className="absolute"
            style={{ left: x - TREE_NODE_WIDTH / 2, top: ROW_TOP[row] }}
          >
            <TreeCard
              name={family[id].name}
              years={family[id].years}
              photo={PHOTOS[id]}
              active={id === OPEN}
            />
          </div>
        ))}
        <div
          className="absolute"
          style={{ left: POPOVER_LEFT, top: POPOVER_TOP }}
        >
          <TreePopover name={family[OPEN].name} years={family[OPEN].years} />
        </div>
      </ScaledCanvas>
    </PanelFrame>
  );
}
