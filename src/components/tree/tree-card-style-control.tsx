import { Controls, ControlButton } from "@xyflow/react";
import { CircleIcon, LockIcon, LockOpenIcon, SquareIcon } from "lucide-react";
import type { TreeCardStyle } from "./use-tree-card-style";

/**
 * Card-style toggle (compact/portrait) + drag-lock toggle — split out from
 * tree-canvas.tsx purely to keep that file under the 150-line component
 * limit. Bottom-left xyflow control cluster (the library's default
 * position).
 *
 * The drag lock uses a custom ControlButton (not xyflow's own built-in lock
 * button, which showInteractive={false} above disables) because this app's
 * card-style button already lives in this same custom cluster — one
 * <Controls> owning both keeps them visually grouped instead of splitting
 * across two separate button stacks.
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
  return (
    // Default xyflow control buttons are 26px/12px-icon — a fine pointer
    // target on desktop but too small to comfortably tap. Bumped up on
    // coarse/touch pointers only (phones, tablets), matching the pointer-fine
    // gate the minimap uses in tree-canvas.tsx — width alone isn't a reliable
    // "mobile" signal (a landscape phone can exceed md). Zoom in/out buttons
    // are dropped entirely there too — pinch-to-zoom covers that on a
    // touchscreen, and two more 44px targets is clutter fit-view/lock don't need.
    <Controls
      showInteractive={false}
      showZoom={showZoom}
      className="pointer-coarse:[&_.react-flow\_\_controls-button]:size-11! pointer-coarse:[&_.react-flow\_\_controls-button_svg]:max-h-5! pointer-coarse:[&_.react-flow\_\_controls-button_svg]:max-w-5!"
    >
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
