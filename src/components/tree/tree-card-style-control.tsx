import { Controls, ControlButton } from "@xyflow/react";
import { RectangleHorizontalIcon, RectangleVerticalIcon } from "lucide-react";
import type { TreeCardStyle } from "./use-tree-card-style";

/**
 * Card-style toggle (compact/portrait) — split out from tree-canvas.tsx
 * purely to keep that file under the 150-line component limit. Bottom-left
 * xyflow control cluster (the library's default position).
 */
export function TreeCardStyleControl({
  cardStyle,
  setCardStyle,
  showZoom,
}: {
  cardStyle: TreeCardStyle;
  setCardStyle: (style: TreeCardStyle) => void;
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
            current one — same convention as a play/pause toggle. A
            horizontal rectangle reads as "wide compact row", a vertical
            one as "tall portrait photo card". fill-none is required: the
            zoom/fitview buttons' own icons are solid shapes styled via
            XYFlow's `.react-flow__controls-button svg { fill: currentColor }`
            rule, which — since a CSS fill declaration beats an SVG
            presentation attribute — would otherwise turn these lucide
            icons into solid blobs instead of the thin-line outline every
            other icon button in this app uses. */}
        {cardStyle === "compact" ? (
          <RectangleVerticalIcon className="fill-none!" />
        ) : (
          <RectangleHorizontalIcon className="fill-none!" />
        )}
      </ControlButton>
    </Controls>
  );
}
