"use client";

import { BranchPanel } from "./branch-panel";
import { OverviewPanel } from "./overview-panel";
import { PersonPanel } from "./person-panel";
import { PlacePanel } from "./place-panel";
import { PlaceEditPanel } from "./place-edit-panel";
import { SearchPanel } from "./search-panel";
import { TimeFeedPanel } from "./time-feed-panel";
import type { FamilyMapState } from "../use-family-map";

/** What the map panel shows for the current focus: the five states
 *  (overview / search / place / branch / person), an edit, or the time
 *  feed while the timeline runs. */
export function PanelContent({
  state,
  onPlay,
  onJump,
}: {
  state: FamilyMapState;
  onPlay: (() => void) | null;
  onJump: (year: number) => void;
}) {
  const { focus, moment } = state;
  if (focus.kind === "search") return <SearchPanel state={state} />;
  if (focus.kind === "editPlace")
    return (
      <PlaceEditPanel
        key={focus.placeId ?? "new"}
        state={state}
        placeId={focus.placeId}
      />
    );
  if (focus.kind === "place")
    return (
      <PlacePanel key={focus.placeId} state={state} placeId={focus.placeId} />
    );
  if (focus.kind === "branch")
    return (
      <BranchPanel key={focus.rootId} state={state} rootId={focus.rootId} />
    );
  if (focus.kind === "person")
    return (
      <PersonPanel
        key={focus.personId}
        state={state}
        personId={focus.personId}
      />
    );
  if (typeof moment === "number")
    return <TimeFeedPanel state={state} year={moment} onJump={onJump} />;
  return <OverviewPanel state={state} onPlay={onPlay} />;
}
