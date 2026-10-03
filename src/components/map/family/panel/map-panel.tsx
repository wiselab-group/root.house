"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { BranchPanel } from "./branch-panel";
import { OverviewPanel } from "./overview-panel";
import { PersonPanel } from "./person-panel";
import { PlacePanel } from "./place-panel";
import { SearchPanel } from "./search-panel";
import { TimeFeedPanel } from "./time-feed-panel";
import type { FamilyMapState } from "../use-family-map";

/**
 * The map's one side panel, in five states (overview / search / place /
 * branch / person) plus the time feed while the timeline runs.
 * Desktop: a card floating at the left. Touch: a bottom sheet — peeking
 * on the overview, half-open on a detail so its lit path stays visible,
 * fully open on demand; it steps aside while the timeline plays.
 * Moves by transform only.
 */
export function MapPanel({
  state,
  invite,
  onJump,
}: {
  state: FamilyMapState;
  invite: React.ReactNode;
  onJump: (year: number) => void;
}) {
  const t = useTranslations("familyMap");
  const [expanded, setExpanded] = useState(false);
  const { focus, moment } = state;
  const inTime = typeof moment === "number";

  let content: React.ReactNode;
  if (focus.kind === "search") content = <SearchPanel state={state} />;
  else if (focus.kind === "place")
    content = (
      <PlacePanel key={focus.placeId} state={state} placeId={focus.placeId} />
    );
  else if (focus.kind === "branch")
    content = (
      <BranchPanel key={focus.rootId} state={state} rootId={focus.rootId} />
    );
  else if (focus.kind === "person")
    content = (
      <PersonPanel
        key={focus.personId}
        state={state}
        personId={focus.personId}
      />
    );
  else if (inTime)
    content = <TimeFeedPanel state={state} year={moment} onJump={onJump} />;
  else content = <OverviewPanel state={state} invite={invite} />;

  const touchPosition =
    focus.kind === "overview" && inTime
      ? "translate-y-full"
      : expanded || focus.kind === "search"
        ? "translate-y-0"
        : focus.kind === "overview"
          ? "translate-y-[calc(100%-17.5rem)]"
          : "translate-y-[35%]";

  return (
    <aside
      aria-label={t("panelLabel")}
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 flex h-[88%] flex-col rounded-t-3xl border-t border-border bg-card text-card-foreground shadow-2xl shadow-black/40 transition-transform duration-slow ease-(--ease-reveal) motion-reduce:transition-none",
        touchPosition,
        "md:pointer-fine:inset-x-auto md:pointer-fine:top-3 md:pointer-fine:bottom-3 md:pointer-fine:left-3 md:pointer-fine:h-auto md:pointer-fine:w-[23rem] md:pointer-fine:translate-y-0 md:pointer-fine:rounded-3xl md:pointer-fine:border",
      )}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={expanded ? t("collapsePanel") : t("expandPanel")}
        onClick={() => setExpanded((v) => !v)}
        className="flex h-6 shrink-0 cursor-pointer items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-ring md:pointer-fine:hidden"
      >
        <span aria-hidden className="h-1 w-10 rounded-full bg-border" />
      </button>
      <div
        data-panel-scroll
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pt-1 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:pointer-fine:pt-5"
      >
        {content}
      </div>
    </aside>
  );
}
