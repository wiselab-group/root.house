"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { PanelContent } from "./panel-content";
import { useSheetSwipe } from "./use-sheet-swipe";
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
  onPlay,
  onJump,
}: {
  state: FamilyMapState;
  onPlay: (() => void) | null;
  onJump: (year: number) => void;
}) {
  const t = useTranslations("familyMap");
  const [expanded, setExpanded] = useState(false);
  const { focus, moment, setFocus } = state;
  // A new focus starts from its own resting height, not the last one.
  const [shownFocus, setShownFocus] = useState(focus);
  if (shownFocus !== focus) {
    setShownFocus(focus);
    setExpanded(false);
  }
  const inTime = typeof moment === "number";

  // The overview rests as a thin strip — title, counts, ▶ — so the map
  // has the screen; a tap on the strip opens the sheet.
  const peeking = focus.kind === "overview" && !inTime && !expanded;
  // Fully open (by hand, or the search): the strip of map above it
  // closes it on a tap, as does a swipe down.
  const open = expanded || focus.kind === "search";
  // Only an open sheet scrolls: a peeking or half-open one hides its lower
  // rows off-screen, so a swipe there opens it instead (useSheetSwipe).
  // Closing returns the list to its top — the strip shows the title and ▶.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) listRef.current?.scrollTo({ top: 0 });
  }, [open]);
  const close = () =>
    expanded ? setExpanded(false) : setFocus({ kind: "overview" });
  const swipe = useSheetSwipe({
    expanded,
    setExpanded,
    onDismiss:
      focus.kind === "overview" || focus.kind === "editPlace"
        ? null
        : () => setFocus({ kind: "overview" }),
  });
  const touchPosition =
    focus.kind === "overview" && inTime
      ? "translate-y-full"
      : expanded || focus.kind === "search"
        ? "translate-y-0"
        : peeking
          ? "translate-y-[calc(100%-6.25rem-env(safe-area-inset-bottom))]"
          : "translate-y-[35%]";

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label={t("closePanel")}
          onClick={close}
          className="absolute inset-0 z-[15] cursor-default md:pointer-fine:hidden"
        />
      )}
      <aside
        aria-label={t("panelLabel")}
        {...swipe}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (peeking && !target.closest("button")) setExpanded(true);
        }}
        className={cn(
          peeking && "cursor-pointer md:pointer-fine:cursor-auto",
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
          className="flex h-8 shrink-0 cursor-pointer items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-ring md:pointer-fine:hidden"
        >
          <span aria-hidden className="h-1.5 w-12 rounded-full bg-border" />
        </button>
        <div
          data-panel-scroll
          ref={listRef}
          // Its rows keep their height (*:shrink-0) — a column that overflows
          // would otherwise squash them to their text.
          className={cn(
            "scroll-fade flex min-h-0 flex-1 flex-col gap-5 overscroll-contain px-5 pt-1 pb-[max(1.25rem,env(safe-area-inset-bottom))] *:shrink-0 md:pointer-fine:overflow-y-auto md:pointer-fine:pt-5",
            open ? "overflow-y-auto" : "overflow-hidden",
          )}
        >
          <PanelContent state={state} onPlay={onPlay} onJump={onJump} />
        </div>
      </aside>
    </>
  );
}
