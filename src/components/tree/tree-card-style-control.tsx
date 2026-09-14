"use client";

import { Controls, ControlButton, useReactFlow } from "@xyflow/react";
import {
  CircleIcon,
  LockIcon,
  LockOpenIcon,
  MaximizeIcon,
  SettingsIcon,
  SquareIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TreeCardStyle } from "./use-tree-card-style";

/**
 * Card-style toggle (compact/portrait) + drag-lock toggle — split out from
 * tree-canvas.tsx purely to keep that file under the 150-line component
 * limit.
 *
 * Two entirely different renderings depending on `isCoarsePointer`:
 *
 * Desktop (pointer: fine) keeps XYFlow's own bottom-left <Controls> cluster
 * (zoom in/out + fit-view + this app's custom style/lock buttons) — a fine
 * pointer has no trouble hitting a 26px control, and the cluster's fixed
 * screen position never competes with anything else there.
 *
 * Mobile/touch (isCoarsePointer) replaces the whole cluster with ONE round
 * FAB (MobileTreeControlsButton, matching Trace/Filter's own floating-button
 * styling in tree-toolbar.tsx) that opens a Popover listing the same
 * actions. Found on a real 390×844 screenshot of real family data (see
 * memory/conversation 2026-09-14): the native 3-button stacked cluster sits
 * ~180px tall in the bottom-left corner, permanently covering whatever tree
 * card happens to pan/zoom underneath it — not a one-off framing, every
 * card eventually passes through that corner on a tree the user is
 * scrolling around. Collapsing to one FAB that's only ever a small circle
 * removes that permanent dead zone; the actions themselves stay reachable
 * one tap further in, inside the popover sheet.
 */
export function TreeCardStyleControl({
  cardStyle,
  setCardStyle,
  draggable,
  setDraggable,
  showZoom,
}: {
  cardStyle: TreeCardStyle;
  setCardStyle: (style: TreeCardStyle) => void;
  /** Omit both (read-only Share Link view, dragging is force-disabled
   *  upstream) to hide the drag-lock button entirely — nothing left for it
   *  to toggle. */
  draggable?: boolean;
  setDraggable?: (draggable: boolean) => void;
  showZoom: boolean;
}) {
  // showZoom doubles as this component's own "are we on a coarse pointer"
  // signal — tree-canvas.tsx already computes it as `!isCoarsePointer`
  // (zoom buttons are redundant with pinch-to-zoom on touch), and the same
  // condition is exactly when this cluster needs to collapse to a FAB.
  const isCoarsePointer = !showZoom;

  if (isCoarsePointer) {
    return (
      <MobileTreeControls
        cardStyle={cardStyle}
        setCardStyle={setCardStyle}
        draggable={draggable}
        setDraggable={setDraggable}
      />
    );
  }

  return (
    <Controls showInteractive={false} showZoom={showZoom}>
      <ControlButton
        onClick={() =>
          setCardStyle(cardStyle === "compact" ? "portrait" : "compact")
        }
        title={
          cardStyle === "compact"
            ? "Показывать карточки с крупным фото"
            : "Показывать компактные карточки"
        }
        aria-pressed={cardStyle === "portrait"}
      >
        {/* Icon shows the shape of the card you'll SWITCH TO, not the
            current one — same convention as a play/pause toggle. A circle
            reads as "round avatar" (compact), a square as "square photo"
            (portrait) — matching each style's actual photo shape. fill-none
            is required: the zoom/fitview buttons' own icons are solid shapes
            styled via XYFlow's
            `.react-flow__controls-button svg { fill: currentColor }` rule,
            which — since a CSS fill declaration beats an SVG presentation
            attribute — would otherwise turn these lucide icons into solid
            blobs instead of the thin-line outline every other icon button
            in this app uses. */}
        {cardStyle === "compact" ? (
          <SquareIcon className="fill-none!" />
        ) : (
          <CircleIcon className="fill-none!" />
        )}
      </ControlButton>
      {setDraggable && (
        <ControlButton
          onClick={() => setDraggable(!draggable)}
          title={
            draggable
              ? "Заблокировать перетаскивание карточек"
              : "Разблокировать перетаскивание карточек"
          }
          aria-pressed={!draggable}
        >
          {/* Closed padlock = locked (default) = cards can't be dragged; open
              padlock = unlocked = dragging enabled — same icon/state mapping
              xyflow's own built-in lock button uses. */}
          {draggable ? (
            <LockOpenIcon className="fill-none!" />
          ) : (
            <LockIcon className="fill-none!" />
          )}
        </ControlButton>
      )}
    </Controls>
  );
}

/**
 * One row inside the mobile popover sheet — icon + label in one 44px-tall
 * tap target, matching this app's other mobile tap targets. Wrapped in
 * PopoverClose (not a plain button) so tapping a row both fires the action
 * AND closes the sheet — same convention as PersonNodePopoverActions' own
 * card-click popover; without it the sheet stayed open over the just-changed
 * tree, one extra dismiss tap away from actually seeing the result.
 * `aria-pressed` shades the row for the drag-lock toggle's current state.
 */
function ControlRow({
  icon,
  label,
  onClick,
  pressed,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <PopoverClose
      render={
        <button
          type="button"
          onClick={onClick}
          aria-pressed={pressed}
          className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-foreground hover:bg-muted aria-pressed:bg-muted"
        />
      }
    >
      <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4.5 [&_svg]:fill-none">
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-left">{label}</span>
    </PopoverClose>
  );
}

function MobileTreeControls({
  cardStyle,
  setCardStyle,
  draggable,
  setDraggable,
}: {
  cardStyle: TreeCardStyle;
  setCardStyle: (style: TreeCardStyle) => void;
  draggable?: boolean;
  setDraggable?: (draggable: boolean) => void;
}) {
  const { fitView } = useReactFlow();

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label="Управление деревом"
            className="absolute bottom-3 left-3 z-10 rounded-full shadow-md"
          />
        }
      >
        <SettingsIcon className="fill-none!" />
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-72 p-1">
        <ControlRow
          icon={<MaximizeIcon />}
          label="Показать всё дерево"
          onClick={() => fitView({ duration: 300 })}
        />
        <ControlRow
          icon={cardStyle === "compact" ? <SquareIcon /> : <CircleIcon />}
          label={
            cardStyle === "compact"
              ? "Крупное фото на карточке"
              : "Компактные карточки"
          }
          onClick={() =>
            setCardStyle(cardStyle === "compact" ? "portrait" : "compact")
          }
        />
        {setDraggable && (
          <ControlRow
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
  );
}
