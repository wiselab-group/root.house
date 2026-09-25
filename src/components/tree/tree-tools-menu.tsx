"use client";

import { Controls, useReactFlow } from "@xyflow/react";
import {
  ChevronUpIcon,
  FilterIcon,
  LockIcon,
  LockOpenIcon,
  MaximizeIcon,
  NetworkIcon,
  RouteIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToolRow } from "./tree-tool-row";

/**
 * "Инструменты" — one bottom-center pill button (matching a reference
 * screenshot's "My view" pill: icon + label + chevron) that opens a popover
 * listing EVERY tree-viewing tool: Relationship Trace, Filter, drag-lock,
 * fit-view. Replaces 4 previously separate floating controls
 * (TreeToolbar's own Trace/Filter round buttons, plus the old desktop
 * <Controls> cluster and mobile settings FAB) per direct user request (2026-09-18) to collapse every
 * entry point into one. Named "Инструменты" rather than a literal
 * translation of "My view" — the set spans both search tools (Trace/
 * Filter) and view settings (lock/fit), and this word covers both.
 *
 * Desktop keeps XYFlow's own zoom in/out +/- buttons as a separate small
 * bottom-left cluster (native pan/zoom affordance, not an app-level tool);
 * coarse-pointer/touch skips that cluster (pinch-to-zoom covers it), making
 * this menu the only control surface there.
 *
 * Clicking Trace/Filter closes this popover (via ToolRow's own
 * PopoverClose) AND fires onOpenTrace/onOpenFilter, which TreeToolbar wires
 * to its own TreeTracePanel/TreeFilterPanel Dialog — unchanged inside,
 * this menu is just a new front door to them.
 */
export function TreeToolsMenu({
  draggable,
  setDraggable,
  showZoom,
  onOpenTrace,
  onOpenFilter,
  isTraceActive,
  isFilterActive,
}: {
  /** Omit both (read-only Share Link view, dragging is force-disabled
   *  upstream) to hide the drag-lock row entirely — nothing left for it
   *  to toggle. */
  draggable?: boolean;
  setDraggable?: (draggable: boolean) => void;
  showZoom: boolean;
  /** Omit both (read-only Share Link view — TreeToolbar itself isn't
   *  rendered there at all) to hide the Trace/Filter rows entirely. */
  onOpenTrace?: () => void;
  onOpenFilter?: () => void;
  isTraceActive?: boolean;
  isFilterActive?: boolean;
}) {
  const { fitView } = useReactFlow();

  return (
    <>
      {showZoom && (
        // Native zoom buttons only — no ControlButton children, those all
        // moved into the popover below. showFitView/showInteractive both
        // suppressed (redundant with "Показать всё дерево" in the menu, and
        // XYFlow's own default lock icon reads confusingly next to this
        // app's own drag-lock row inside the popover).
        <Controls
          showZoom
          showFitView={false}
          showInteractive={false}
          position="bottom-left"
        />
      )}
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 gap-2 rounded-full pl-4 pr-3 shadow-md"
            />
          }
        >
          <NetworkIcon className="size-4 fill-none!" />
          Инструменты
          <ChevronUpIcon className="size-3.5 fill-none! text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent side="top" align="center" className="w-72">
          {onOpenTrace && (
            <ToolRow
              icon={<RouteIcon />}
              label="Сравнить родство двух людей"
              onClick={onOpenTrace}
              pressed={isTraceActive}
            />
          )}
          {onOpenFilter && (
            <ToolRow
              icon={<FilterIcon />}
              label="Фильтр"
              onClick={onOpenFilter}
              pressed={isFilterActive}
            />
          )}
          <ToolRow
            icon={<MaximizeIcon />}
            label="Показать всё дерево"
            onClick={() => fitView({ duration: 300 })}
          />
          {setDraggable && (
            <ToolRow
              icon={draggable ? <LockOpenIcon /> : <LockIcon />}
              label={
                draggable
                  ? "Заблокировать перетаскивание"
                  : "Разрешить перетаскивание"
              }
              pressed={draggable}
              onClick={() => setDraggable(!draggable)}
            />
          )}
        </PopoverContent>
      </Popover>
    </>
  );
}
