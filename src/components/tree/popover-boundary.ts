/** Gap between a card popover and the edge of the visible tree area, px. */
export const POPOVER_EDGE_GAP = 8;

export interface BoundaryRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The part of the screen where the tree is actually visible — the card
 * popover's collision boundary. Base UI's default (the anchor's clipping
 * ancestors) let a tall popover with a photo flip above a card and run up
 * under the app header on a phone (user screenshot, 2026-10-02), and it
 * knows nothing about the dock floating over the canvas's bottom edge. So:
 * the canvas, clipped to the window, below the header and above the dock
 * (the dock's whole column, so an open «Родство» shelf counts too).
 */
export function visibleTreeRect(anchor: Element): BoundaryRect | undefined {
  const canvas = anchor.closest(".react-flow");
  if (!canvas) return undefined;
  const area = canvas.getBoundingClientRect();
  let top = Math.max(area.top, 0);
  let bottom = Math.min(area.bottom, window.innerHeight);
  const left = Math.max(area.left, 0);
  const right = Math.min(area.right, window.innerWidth);

  const header = document.querySelector(".app-header");
  if (header) top = Math.max(top, header.getBoundingClientRect().bottom);

  const dock = canvas.querySelector("[data-bottom-bar] [role='toolbar']");
  const dockColumn = dock?.parentElement;
  if (dockColumn)
    bottom = Math.min(bottom, dockColumn.getBoundingClientRect().top);

  if (bottom <= top || right <= left) return undefined;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** The card popover's width (PopoverContent's w-64) and gap to its card, px. */
const POPOVER_WIDTH = 256;
export const POPOVER_SIDE_OFFSET = 14;

export type PopoverSide = "right" | "left" | "top" | "bottom";

export interface PopoverPlacement {
  side: PopoverSide;
  /** Height the popover may take above/below the card, px; unset beside it. */
  room?: number;
}

/**
 * Where the card popover opens. Beside the card when it fits (right
 * first), else above or below — whichever has more room — capped to that
 * room, so the popover shrinks into it (the photo gives up height, the
 * rest scrolls). Base UI on its own only fell back to above/below when the
 * popover fit there at full height, which with a photo it never did on a
 * phone: it stayed beside the card and `sticky` slid it right over the
 * card it belongs to; and with the side forced, it slid the too-tall
 * popover onto the card before capping its height (2026-10-04).
 */
export function popoverPlacement(
  card: DOMRect,
  area: BoundaryRect,
): PopoverPlacement {
  const besideNeeds = POPOVER_WIDTH + POPOVER_SIDE_OFFSET + POPOVER_EDGE_GAP;
  if (area.x + area.width - card.right >= besideNeeds) return { side: "right" };
  if (card.left - area.x >= besideNeeds) return { side: "left" };
  const above = card.top - area.y;
  const below = area.y + area.height - card.bottom;
  const side = above >= below ? "top" : "bottom";
  const room = Math.max(above, below) - POPOVER_SIDE_OFFSET - POPOVER_EDGE_GAP;
  return { side, room: Math.floor(room) };
}
