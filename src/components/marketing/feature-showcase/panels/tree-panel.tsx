import { MiniPersonCard } from "@/components/marketing/shared/mini-person-card";
import { HARTLEY_FAMILY } from "@/components/marketing/shared/hartley-family";
import {
  MEMORY_CONNECTORS,
  MEMORY_FRAGMENTS,
} from "@/components/marketing/memory-box/memory-fragments.data";
import { PanelFrame } from "./panel-frame";

/** The finished Hartley tree from the memory box, "You" selected. Reuses
 *  the memory box's own desktop slots and connectors so both pictures are
 *  literally the same family tree; scaled up as a whole (cards and lines
 *  together, so they stay aligned) since the slots leave wide margins. */
export function TreePanel() {
  const { viewBox, paths } = MEMORY_CONNECTORS.desktop;
  return (
    <PanelFrame className="flex items-center bg-tree-canvas p-[4%]">
      <div className="@container relative aspect-[16/10] w-full scale-125">
        <svg viewBox={viewBox} className="absolute inset-0 size-full">
          {paths.map((d) => (
            <path
              key={d}
              d={d}
              fill="none"
              stroke="var(--branch)"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {MEMORY_FRAGMENTS.map(({ person, to }) => (
          <div
            key={person}
            className="absolute w-[11%] -translate-x-1/2"
            style={{ left: `${to.desktop.x}%`, top: `${to.desktop.y}cqw` }}
          >
            <MiniPersonCard
              {...HARTLEY_FAMILY[person]}
              active={person === "owen"}
            />
          </div>
        ))}
      </div>
    </PanelFrame>
  );
}
