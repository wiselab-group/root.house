import { describe, expect, it } from "vitest";
import { roundedOrthogonalPath } from "./orthogonal-path";

describe("roundedOrthogonalPath", () => {
  it("draws a plain straight line, no curve commands, when a middle sibling sits directly under the parent trunk's own x (sourceX === targetX)", () => {
    // Real bug the user caught: a middle sibling in a row of 5+ (not the
    // leftmost/rightmost, which genuinely jog sideways) can end up with
    // targetX === sourceX — the caller-built "down, across, down" polyline
    // then has a zero-length middle segment, and feeding that straight into
    // the rounding loop inserted a pointless little hook (two Q curves)
    // partway down what should read as one plain vertical line.
    const path = roundedOrthogonalPath([
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 100, y: 50 },
      { x: 100, y: 100 },
    ]);
    expect(path).toBe("M100,0 L100,100");
    expect(path).not.toContain("Q");
  });

  it("still rounds the corner for an edge sibling that genuinely jogs sideways (sourceX !== targetX)", () => {
    const path = roundedOrthogonalPath([
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 250, y: 50 },
      { x: 250, y: 100 },
    ]);
    expect(path).toContain("Q");
    // Two real corners (down→across, across→down) — two rounded joins.
    expect(path.match(/Q/g)).toHaveLength(2);
  });

  it("collapses a 5-point union trunk (with an extra clearY hop) to a plain straight line the same way when its target sits directly under its source", () => {
    const path = roundedOrthogonalPath([
      { x: 100, y: 0 },
      { x: 100, y: 20 },
      { x: 100, y: 50 },
      { x: 100, y: 50 },
      { x: 100, y: 100 },
    ]);
    expect(path).toBe("M100,0 L100,100");
  });

  it("handles a horizontal-only collinear run the same way (defensive — the tree only ever produces vertical middle segments today, but the rule is symmetric)", () => {
    const path = roundedOrthogonalPath([
      { x: 0, y: 50 },
      { x: 40, y: 50 },
      { x: 80, y: 50 },
    ]);
    expect(path).toBe("M0,50 L80,50");
  });

  it("draws a sharp corner (no Q curve) at a point named in sharpAt, leaving the OTHER corner rounded", () => {
    // Real bug the user caught (screenshot with arrows): a middle sibling's
    // own turn down into its card, at (targetX, midY), is a sideways jog
    // flanked by other similarly-jogging siblings' lines — rounding it
    // reads as an ugly zigzag knot. sharpAt lets the caller (which knows,
    // from xyflow-adapter.ts's isMiddleSibling, that this child is a middle
    // sibling) draw a plain angle at that turn instead, leaving the OTHER
    // bend — (sourceX, midY), the T-off-the-trunk point — rounded as usual.
    const path = roundedOrthogonalPath(
      [
        { x: 100, y: 0 },
        { x: 100, y: 50 },
        { x: 250, y: 50 },
        { x: 250, y: 100 },
      ],
      [{ x: 250, y: 50 }],
    );
    // Sharp at the target-side bend (250,50): straight L, no Q around it.
    expect(path).toBe("M100,0 L100,42 Q100,50 108,50 L250,50 L250,100");
    // Only one Q command left — the OTHER (source-side) bend still rounds.
    expect(path.match(/Q/g)).toHaveLength(1);
  });

  it("matches sharpAt points by coordinate, not index — still finds the target-side bend after dropNonTurningPoints shifts indices", () => {
    // The 5-point union-trunk shape collapses its first TWO points (both on
    // sourceX) into one via dropNonTurningPoints before the rounding loop
    // ever runs — sharpAt must still match the (targetX, midY) bend by its
    // actual coordinates, not by whatever index it happened to have in the
    // caller's original 5-point array.
    const path = roundedOrthogonalPath(
      [
        { x: 100, y: 0 },
        { x: 100, y: 20 },
        { x: 100, y: 50 },
        { x: 250, y: 50 },
        { x: 250, y: 100 },
      ],
      [{ x: 250, y: 50 }],
    );
    expect(path).not.toContain("Q250,50");
    expect(path.match(/Q/g)).toHaveLength(1);
  });
});
