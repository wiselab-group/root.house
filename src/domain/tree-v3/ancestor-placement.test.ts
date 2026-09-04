import { describe, it, expect } from "vitest";
import { RowRegistry, nudgeCluster } from "./ancestor-placement";
import { CARD_WIDTH, INTER_FAMILY_GAP, SPOUSE_GAP } from "./subtree";
import type { PlacedPosition } from "./placement";

const COUPLE_WIDTH = CARD_WIDTH * 2 + SPOUSE_GAP;

describe("RowRegistry.place", () => {
  it("places the first cluster on a row at exactly its preferred center", () => {
    const registry = new RowRegistry();
    const result = registry.place(
      -720,
      "cluster-a",
      "paternal",
      "family-a",
      -500,
      COUPLE_WIDTH,
      -500,
    );
    expect(result.centerX).toBe(-500);
    expect(result.delta).toBe(0);
  });

  it("does not move a second cluster that already clears INTER_FAMILY_GAP from an unrelated neighbor", () => {
    const registry = new RowRegistry();
    registry.place(
      -720,
      "cluster-a",
      "paternal",
      "family-a",
      -500,
      COUPLE_WIDTH,
      -500,
    );
    // Far enough right that INTER_FAMILY_GAP is already satisfied.
    const result = registry.place(
      -720,
      "cluster-b",
      "maternal",
      "family-b",
      500,
      COUPLE_WIDTH,
      500,
    );
    expect(result.delta).toBe(0);
    expect(result.centerX).toBe(500);
  });

  it("pushes an unrelated-family neighbor right by exactly the INTER_FAMILY_GAP deficit", () => {
    const registry = new RowRegistry();
    registry.place(
      -720,
      "cluster-a",
      "paternal",
      "family-a",
      0,
      COUPLE_WIDTH,
      0,
    );
    // cluster-a occupies [-COUPLE_WIDTH/2, COUPLE_WIDTH/2]. Ask for a
    // neighbor whose preferred LEFT EDGE (preferredCenterX - width/2) is
    // only 10px clear of that right edge.
    const preferredLeftEdge = COUPLE_WIDTH / 2 + 10;
    const preferredCenterX = preferredLeftEdge + COUPLE_WIDTH / 2;
    const result = registry.place(
      -720,
      "cluster-b",
      "maternal",
      "family-b",
      preferredCenterX,
      COUPLE_WIDTH,
      preferredCenterX,
    );
    const expectedLeftEdge = COUPLE_WIDTH / 2 + INTER_FAMILY_GAP;
    const expectedCenterX = expectedLeftEdge + COUPLE_WIDTH / 2;
    expect(result.centerX).toBe(expectedCenterX);
    expect(result.delta).toBeCloseTo(expectedCenterX - preferredCenterX, 6);
  });

  it("uses the tighter same-family sibling gap (2×SPOUSE_GAP) for clusters sharing a familyRootId", () => {
    const registry = new RowRegistry();
    registry.place(
      -720,
      "cluster-a",
      "paternal",
      "family-a",
      0,
      COUPLE_WIDTH,
      0,
    );
    const preferredLeftEdge = COUPLE_WIDTH / 2 + 10;
    const preferredCenterX = preferredLeftEdge + COUPLE_WIDTH / 2;
    const result = registry.place(
      -720,
      "cluster-b",
      "paternal",
      "family-a", // same family as cluster-a
      preferredCenterX,
      COUPLE_WIDTH,
      preferredCenterX,
    );
    const expectedLeftEdge = COUPLE_WIDTH / 2 + SPOUSE_GAP * 2;
    const expectedCenterX = expectedLeftEdge + COUPLE_WIDTH / 2;
    expect(result.centerX).toBe(expectedCenterX);
  });

  it("never nudges a cluster left — only ever pushes right against its left neighbor", () => {
    const registry = new RowRegistry();
    registry.place(
      -720,
      "cluster-a",
      "paternal",
      "family-a",
      0,
      COUPLE_WIDTH,
      0,
    );
    const result = registry.place(
      -720,
      "cluster-b",
      "maternal",
      "family-b",
      1000, // already far clear
      COUPLE_WIDTH,
      1000,
    );
    expect(result.delta).toBeGreaterThanOrEqual(0);
  });

  it("keeps rows on different Y fully independent", () => {
    const registry = new RowRegistry();
    registry.place(
      -720,
      "cluster-a",
      "paternal",
      "family-a",
      0,
      COUPLE_WIDTH,
      0,
    );
    const result = registry.place(
      -960,
      "cluster-b",
      "paternal",
      "family-b",
      0, // same x, different Y — must not collide
      COUPLE_WIDTH,
      0,
    );
    expect(result.delta).toBe(0);
    expect(result.centerX).toBe(0);
  });

  it("handles N (more than 2) unrelated clusters on one row, each only nudged by its immediate left neighbor", () => {
    const registry = new RowRegistry();
    // Reproduces the actual bug trigger: 4 unrelated ancestor-couples on one
    // row. Preferred centers are close enough to force the sweep to nudge —
    // spaced by COUPLE_WIDTH exactly (no gap at all before resolution).
    const r1 = registry.place(
      -720,
      "vladimir-marfa",
      "paternal",
      "family-1",
      -600,
      COUPLE_WIDTH,
      -600,
    );
    const r2 = registry.place(
      -720,
      "krivusha",
      "paternal",
      "family-2",
      -600 + COUPLE_WIDTH,
      COUPLE_WIDTH,
      -600 + COUPLE_WIDTH,
    );
    const r3 = registry.place(
      -720,
      "vasily-elizaveta",
      "maternal",
      "family-3",
      600,
      COUPLE_WIDTH,
      600,
    );
    const r4 = registry.place(
      -720,
      "grigory-agrafena",
      "maternal",
      "family-4",
      600 + COUPLE_WIDTH,
      COUPLE_WIDTH,
      600 + COUPLE_WIDTH,
    );

    expect(r1.centerX).toBeLessThan(r2.centerX);
    expect(r2.centerX).toBeLessThan(r3.centerX);
    expect(r3.centerX).toBeLessThan(r4.centerX);

    const clusters = registry.clustersAt(-720);
    expect(clusters).toHaveLength(4);
    for (let i = 1; i < clusters.length; i++) {
      const gap = clusters[i].leftEdge - clusters[i - 1].rightEdge;
      expect(gap).toBeGreaterThanOrEqual(INTER_FAMILY_GAP - 1e-6);
    }
  });
});

describe("nudgeCluster", () => {
  it("shifts only person ids owned by the given clusterId", () => {
    const positionByPerson = new Map<string, PlacedPosition>([
      ["owned-1", { x: 100, y: -720 }],
      ["owned-2", { x: 200, y: -720 }],
      ["not-owned", { x: 300, y: -720 }],
    ]);
    const ownerByPerson = new Map<string, string>([
      ["owned-1", "cluster-a"],
      ["owned-2", "cluster-a"],
      ["not-owned", "cluster-b"],
    ]);
    nudgeCluster("cluster-a", 50, ownerByPerson, positionByPerson);
    expect(positionByPerson.get("owned-1")!.x).toBe(150);
    expect(positionByPerson.get("owned-2")!.x).toBe(250);
    expect(positionByPerson.get("not-owned")!.x).toBe(300); // untouched — different owner
  });

  it("is a no-op when delta is 0", () => {
    const positionByPerson = new Map<string, PlacedPosition>([
      ["owned-1", { x: 100, y: -720 }],
    ]);
    const ownerByPerson = new Map<string, string>([["owned-1", "cluster-a"]]);
    nudgeCluster("cluster-a", 0, ownerByPerson, positionByPerson);
    expect(positionByPerson.get("owned-1")!.x).toBe(100);
  });

  it("never touches a person with no recorded owner", () => {
    const positionByPerson = new Map<string, PlacedPosition>([
      ["orphan", { x: 100, y: -720 }],
    ]);
    const ownerByPerson = new Map<string, string>(); // orphan not recorded at all
    nudgeCluster("cluster-a", 999, ownerByPerson, positionByPerson);
    expect(positionByPerson.get("orphan")!.x).toBe(100);
  });
});
