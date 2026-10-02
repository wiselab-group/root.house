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
