"use client";

import { useReactFlow } from "@xyflow/react";
import {
  ChevronUpIcon,
  FilterIcon,
  LockIcon,
  LockOpenIcon,
  MaximizeIcon,
  NetworkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToolRow } from "./tree-tool-row";

/**
 * The canvas's bottom-center bar: the "Инструменты" pill (icon + label +
 * chevron) opening a popover of tree-viewing tools — Filter, fit-view,
 * drag-lock — plus whatever `children` the page puts beside it (the
 * "Родство" button, see kinship/kinship-button.tsx).
 *
 * Relationship Trace used to be a row in this popover; it moved to its own
 * button and panel (2026-09-27, user request) since it answers a question
 * rather than adjusting the view. XYFlow's zoom +/- cluster was removed at
 * the same time, also per user request: wheel/trackpad/pinch already zoom,
 * and "Показать всё дерево" here covers getting back to the whole family.
 *
 * Clicking Filter closes this popover (via ToolRow's own PopoverClose) AND
 * fires onOpenFilter, which TreeToolbar wires to its TreeFilterPanel Dialog.
 */
export function TreeToolsMenu({
  draggable,
  setDraggable,
  onOpenFilter,
  isFilterActive,
  children,
}: {
  /** Omit both (read-only Share Link view, dragging is force-disabled
   *  upstream) to hide the drag-lock row entirely — nothing left for it
   *  to toggle. */
  draggable?: boolean;
  setDraggable?: (draggable: boolean) => void;
  /** Omitted on the read-only Share Link view (TreeToolbar itself isn't
   *  rendered there at all), which hides the Filter row. */
  onOpenFilter?: () => void;
  isFilterActive?: boolean;
  children?: React.ReactNode;
}) {
  const { fitView } = useReactFlow();

  return (
    // Full-width row, centered with justify-center rather than left-1/2 +
    // -translate-x-1/2: an absolutely positioned box at left:50% only gets
    // half the canvas as its available width, which clipped the "Родство"
    // chip on phones. Click-through outside the buttons themselves.
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-2 px-4 *:pointer-events-auto">
      <Popover>
        <PopoverTrigger
          render={
            // Icon-only below sm, so the "Родство" answer chip beside it
            // keeps enough width on a phone.
            <Button
              variant="outline"
              className="gap-2 rounded-full pr-3 pl-4 shadow-md max-sm:size-11 max-sm:px-0"
            />
          }
        >
          <NetworkIcon className="size-4 fill-none!" />
          <span className="max-sm:sr-only">Инструменты</span>
          <ChevronUpIcon className="size-3.5 fill-none! text-muted-foreground max-sm:hidden" />
        </PopoverTrigger>
        <PopoverContent side="top" align="center" className="w-72">
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
      {children}
    </div>
  );
}
