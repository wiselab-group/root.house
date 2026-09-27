"use client";

import {
  Panel,
  getNodesBounds,
  useStore,
  type ReactFlowState,
} from "@xyflow/react";

/** XYFlow MiniMap's own defaults (@xyflow/react 12, MiniMapComponent) —
 *  this frame redraws its geometry, so the two must match. */
const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 150;
const MINIMAP_OFFSET_SCALE = 5;
/** On-screen corner radius and stroke of the viewport frame. */
const FRAME_RADIUS = 4;
const FRAME_STROKE = 2;

interface FrameGeometry {
  viewBox: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

/**
 * The minimap's viewport frame, rounded (user request). XYFlow draws that
 * frame as the stroke of its dimming mask — one evenodd path, which can't
 * take a corner radius — so the mask keeps only its fill (globals.css sets
 * its stroke transparent) and this overlay draws the frame as a real
 * <rect rx>. It's a second bottom-right Panel stacked exactly over the
 * MiniMap (same size, same 1px border box) with the same viewBox math as
 * XYFlow's MiniMapComponent, so the two stay aligned through every pan/zoom.
 */
export function MiniMapViewportFrame({ className }: { className?: string }) {
  const frame = useStore(selectFrame, frameEqual);

  return (
    <Panel
      position="bottom-right"
      aria-hidden="true"
      className={`pointer-events-none border border-transparent ${className ?? ""}`}
    >
      <svg
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        viewBox={frame.viewBox}
        className="block"
      >
        <rect
          x={frame.x}
          y={frame.y}
          width={frame.width}
          height={frame.height}
          rx={frame.radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={FRAME_STROKE}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </Panel>
  );
}

function selectFrame(s: ReactFlowState): FrameGeometry {
  const [tx, ty, zoom] = s.transform;
  const view = {
    x: -tx / zoom,
    y: -ty / zoom,
    width: s.width / zoom,
    height: s.height / zoom,
  };
  const visible = s.nodes.filter((node) => !node.hidden);
  const bounds = visible.length
    ? union(getNodesBounds(visible, { nodeLookup: s.nodeLookup }), view)
    : view;

  const viewScale = Math.max(
    bounds.width / MINIMAP_WIDTH,
    bounds.height / MINIMAP_HEIGHT,
  );
  const viewWidth = viewScale * MINIMAP_WIDTH;
  const viewHeight = viewScale * MINIMAP_HEIGHT;
  const offset = MINIMAP_OFFSET_SCALE * viewScale;
  const x = bounds.x - (viewWidth - bounds.width) / 2 - offset;
  const y = bounds.y - (viewHeight - bounds.height) / 2 - offset;

  return {
    viewBox: `${x} ${y} ${viewWidth + offset * 2} ${viewHeight + offset * 2}`,
    ...view,
    radius: FRAME_RADIUS * viewScale,
  };
}

function union(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}

function frameEqual(a: FrameGeometry, b: FrameGeometry): boolean {
  return (
    a.viewBox === b.viewBox &&
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height
  );
}
