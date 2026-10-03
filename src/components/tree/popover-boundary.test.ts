import { describe, expect, it } from "vitest";
import { popoverPlacement } from "./popover-boundary";

const card = (left: number, top: number) =>
  ({ left, top, right: left + 110, bottom: top + 150 }) as DOMRect;

describe("popoverPlacement", () => {
  const desktop = { x: 0, y: 64, width: 1280, height: 760 };
  const phone = { x: 0, y: 68, width: 390, height: 696 };

  it("opens beside the card, right first, when it fits", () => {
    expect(popoverPlacement(card(585, 380), desktop)).toEqual({
      side: "right",
    });
  });

  it("flips left near the right edge", () => {
    expect(popoverPlacement(card(1100, 380), desktop)).toEqual({
      side: "left",
    });
  });

  it("goes above a centered card on a phone, capped to the room there", () => {
    // 360 - 68 above vs 764 - 510 below; minus the 14px gap and 8px edge.
    expect(popoverPlacement(card(140, 360), phone)).toEqual({
      side: "top",
      room: 270,
    });
  });

  it("goes below when there's more room under the card", () => {
    expect(popoverPlacement(card(140, 120), phone)).toEqual({
      side: "bottom",
      room: 472,
    });
  });
});
