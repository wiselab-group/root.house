"use client";

import type { TimelineRange } from "@/domain/place/map-snapshot";
import { TimelineDock } from "./timeline-dock";
import type { FamilyMapState } from "../use-family-map";

/**
 * Bottom-centre of the map, right of the desktop panel: the timeline while
 * a year is shown, otherwise the «▶ how we got here» invitation (desktop
 * only — on touch it lives in the sheet). Out of the way while a place is
 * being edited: the map is the picker then.
 */
export function MapBottomBar({
  state,
  range,
  invite,
  playing,
  onPlay,
  onPause,
  onScrub,
  onAllTime,
}: {
  state: FamilyMapState;
  range: TimelineRange;
  invite: React.ReactNode;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onScrub: (year: number) => void;
  onAllTime: () => void;
}) {
  if (state.focus.kind === "editPlace") return null;
  return (
    <div
      data-bottom-bar
      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pointer-fine:left-[24.5rem] md:pointer-fine:px-6 md:pointer-fine:pb-6"
    >
      {typeof state.moment === "number" ? (
        <div className="pointer-events-auto w-full md:pointer-fine:w-auto">
          <TimelineDock
            state={state}
            range={range}
            year={state.moment}
            playing={playing}
            onPlay={onPlay}
            onPause={onPause}
            onScrub={onScrub}
            onAllTime={onAllTime}
          />
        </div>
      ) : (
        invite
      )}
    </div>
  );
}
