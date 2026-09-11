import { describe, expect, it } from "vitest";
import type { TreeLayoutGraph, LayoutNode, LayoutEdge } from "@/domain/tree/tree-layout.builder";
import { pruneCollapsedDescendants, personIdsWithChildren } from "./prune-collapsed";
import { buildTreeLayout } from "@/domain/tree/layout/layout";
import { generateRandomFamily } from "@/domain/tree/layout/random-graph";

/** Minimal fake node — only the fields pruneCollapsedDescendants/personIdsWithChildren actually read. */
function node(id: string): LayoutNode {
  return {
    id,
    kind: "person",
    personId: id,
    x: 0,
    y: 0,
    generation: 0,
    isFocus: false,
    isIsolated: false,
    person: {
      id,
      slug: id,
      firstName: id,
      lastName: null,
      nickname: null,
      isPlaceholder: false,
      isLiving: true,
      birthYear: null,
      deathYear: null,
      photoMediaId: null,
      gender: "unknown",
      religion: null,
      nationality: null,
    },
  };
}

function parentChildEdge(parentId: string, childId: string): LayoutEdge {
  return { id: `pc-${parentId}-${childId}`, kind: "parent_child", source: parentId, target: childId };
}

function partnershipEdge(a: string, b: string): LayoutEdge {
  return { id: `partner-${a}-${b}`, kind: "partnership", source: a, target: b };
}

/**
 * A -> B -> [C, D]; C -> E. F is A's spouse (partnership edge, no children of their own).
 * A is the graph's focusPersonId throughout, unless a test overrides it.
 */
function buildGraph(focusPersonId = "a"): TreeLayoutGraph {
  return {
    focusPersonId,
    nodes: ["a", "b", "c", "d", "e", "f"].map(node),
    edges: [
      parentChildEdge("a", "b"),
      parentChildEdge("b", "c"),
      parentChildEdge("b", "d"),
      parentChildEdge("c", "e"),
      partnershipEdge("a", "f"),
    ],
  };
}

describe("personIdsWithChildren", () => {
  it("returns every person who is the SOURCE of at least one parent_child edge", () => {
    const graph = buildGraph();
    expect(personIdsWithChildren(graph)).toEqual(new Set(["a", "b", "c"]));
  });

  it("a childless leaf (d, e, f) is never included", () => {
    const graph = buildGraph();
    const ids = personIdsWithChildren(graph);
    expect(ids.has("d")).toBe(false);
    expect(ids.has("e")).toBe(false);
    expect(ids.has("f")).toBe(false);
  });
});

describe("pruneCollapsedDescendants", () => {
  it("returns the SAME graph reference when collapsedIds is empty (no-op fast path)", () => {
    const graph = buildGraph();
    expect(pruneCollapsedDescendants(graph, new Set())).toBe(graph);
  });

  it("collapsing a person hides every descendant reachable by walking DOWN parent_child edges, but keeps the collapsed person's own card", () => {
    const graph = buildGraph();
    const pruned = pruneCollapsedDescendants(graph, new Set(["b"]));
    const remainingIds = new Set(pruned.nodes.map((n) => n.id));
    expect(remainingIds).toEqual(new Set(["a", "b", "f"])); // c, d, e all hidden — b itself stays
  });

  it("attaches collapsedDescendantCount to the collapsed person's own node, counting every hidden descendant (not just direct children)", () => {
    const graph = buildGraph();
    const pruned = pruneCollapsedDescendants(graph, new Set(["b"]));
    const bNode = pruned.nodes.find((n) => n.id === "b")!;
    expect(bNode.collapsedDescendantCount).toBe(3); // c, d, e
  });

  it("collapsing a person's SPOUSE never hides that person or their own descendants — only walks DOWN, never sideways to a partnership", () => {
    const graph = buildGraph();
    const pruned = pruneCollapsedDescendants(graph, new Set(["f"]));
    const remainingIds = new Set(pruned.nodes.map((n) => n.id));
    expect(remainingIds).toEqual(new Set(["a", "b", "c", "d", "e", "f"])); // f has no children — nothing to hide
  });

  it("removes every edge touching a hidden person, on either end", () => {
    const graph = buildGraph();
    const pruned = pruneCollapsedDescendants(graph, new Set(["b"]));
    for (const edge of pruned.edges) {
      expect(["a", "b", "f"]).toContain(edge.source);
      expect(["a", "b", "f"]).toContain(edge.target);
    }
    // Specifically: b->c, b->d, c->e are all gone; a->b and a--f survive.
    const edgeIds = new Set(pruned.edges.map((e) => e.id));
    expect(edgeIds.has("pc-a-b")).toBe(true);
    expect(edgeIds.has("partner-a-f")).toBe(true);
    expect(edgeIds.has("pc-b-c")).toBe(false);
    expect(edgeIds.has("pc-b-d")).toBe(false);
    expect(edgeIds.has("pc-c-e")).toBe(false);
  });

  it("collapsing an ANCESTOR of the current focus person never hides the focus person's own card, even though they're a descendant", () => {
    // c is a descendant of b, and c is ALSO this graph's own focusPersonId.
    const graph = buildGraph("c");
    const pruned = pruneCollapsedDescendants(graph, new Set(["b"]));
    const remainingIds = new Set(pruned.nodes.map((n) => n.id));
    expect(remainingIds.has("c")).toBe(true); // rescued despite being b's descendant
    expect(remainingIds.has("d")).toBe(false); // d (not the focus) still hidden as normal
    // The focus's own connector back to the (visible) collapsed ancestor b
    // must survive too, or the rescued card would render disconnected.
    const edgeIds = new Set(pruned.edges.map((e) => e.id));
    expect(edgeIds.has("pc-b-c")).toBe(true);
  });

  it("collapsing the focus person's own ancestor still reports the TRUE full descendant count on the badge, unaffected by the focus-person rescue", () => {
    const graph = buildGraph("c");
    const pruned = pruneCollapsedDescendants(graph, new Set(["b"]));
    const bNode = pruned.nodes.find((n) => n.id === "b")!;
    expect(bNode.collapsedDescendantCount).toBe(3); // c, d, e — same as the non-rescued case
  });

  it("collapsing two nested ancestors (b and c) only charges the OUTER one (b) a visible badge — the inner one (c) has no visible card left to carry it", () => {
    const graph = buildGraph();
    const pruned = pruneCollapsedDescendants(graph, new Set(["b", "c"]));
    const remainingIds = new Set(pruned.nodes.map((n) => n.id));
    expect(remainingIds).toEqual(new Set(["a", "b", "f"])); // c itself is hidden (b's own descendant)
    const bNode = pruned.nodes.find((n) => n.id === "b")!;
    expect(bNode.collapsedDescendantCount).toBe(3); // still the full c+d+e count
  });
});

/**
 * Property-based sweep (rewrite plan §7 Stage 5 gate: "свернуть случайное
 * подмножество поддеревьев, инварианты держатся") over real random family
 * shapes from the layout engine's own generator (src/domain/tree/layout/
 * random-graph.ts) — not just the tiny hand-built fixture above. Converts a
 * TreeLayoutResult straight into a minimal TreeLayoutGraph (skipping
 * tree-adapter.ts's DB-record mapping entirely, since pruneCollapsedDescendants/
 * personIdsWithChildren only ever read id/x/y/generation/person.id and
 * edge.kind/source/target — nothing DB-specific).
 */
function toMinimalLayoutGraph(seed: number, personCount: number): TreeLayoutGraph {
  const { graph, focusPersonId } = generateRandomFamily({
    seed,
    personCount,
    direction: "up",
  });
  const result = buildTreeLayout(graph, focusPersonId);

  const nodes: LayoutNode[] = result.persons.map((p) => ({
    id: p.id,
    kind: "person",
    personId: p.id,
    x: p.x,
    y: p.y,
    generation: p.generation,
    isFocus: p.id === focusPersonId,
    isIsolated: p.isIsolated,
    person: {
      id: p.id,
      slug: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      nickname: null,
      isPlaceholder: false,
      isLiving: true,
      birthYear: null,
      deathYear: null,
      photoMediaId: null,
      gender: p.gender,
      religion: null,
      nationality: null,
    },
  }));

  const edges: LayoutEdge[] = [
    ...result.relationships
      .filter((r) => r.kind === "parent-child")
      .map((r) => ({
        id: `pc-${r.from}-${r.to}`,
        kind: "parent_child" as const,
        source: r.from,
        target: r.to,
      })),
    ...result.partnerships.map((p) => ({
      id: `partner-${p.leftPersonId}-${p.rightPersonId}`,
      kind: "partnership" as const,
      source: p.leftPersonId,
      target: p.rightPersonId,
    })),
  ];

  return { nodes, edges, focusPersonId };
}

describe("pruneCollapsedDescendants — property sweep over random family graphs", () => {
  const SEED_COUNT = 40;
  const PERSON_COUNT = 30;

  for (let seed = 0; seed < SEED_COUNT; seed++) {
    it(`seed=${seed}: collapsing a random subset of childful persons keeps the graph internally consistent`, () => {
      const graph = toMinimalLayoutGraph(seed * 7919, PERSON_COUNT);
      const withChildren = [...personIdsWithChildren(graph)];
      if (withChildren.length === 0) return; // nothing to collapse this seed — trivially fine

      // Deterministic "random" subset from the seed itself — every third
      // childful person, offset by the seed, is collapsed.
      const collapsedIds = new Set(
        withChildren.filter((_, i) => (i + seed) % 3 === 0),
      );

      const pruned = pruneCollapsedDescendants(graph, collapsedIds);
      const remainingIds = new Set(pruned.nodes.map((n) => n.id));

      // 1. The focus person is NEVER hidden, regardless of what got collapsed.
      expect(remainingIds.has(graph.focusPersonId)).toBe(true);

      // 2. Every remaining edge's source AND target are both still present
      //    as nodes — no dangling edge pointing at a hidden person.
      for (const edge of pruned.edges) {
        expect(remainingIds.has(edge.source)).toBe(true);
        expect(remainingIds.has(edge.target)).toBe(true);
      }

      // 3. Every node carrying a collapsedDescendantCount is one of the
      //    ids that was ACTUALLY requested to collapse (never a stray
      //    count on an unrelated node).
      for (const n of pruned.nodes) {
        if (n.collapsedDescendantCount !== undefined) {
          expect(collapsedIds.has(n.id)).toBe(true);
        }
      }

      // 4. Node count only ever shrinks (or stays equal) after pruning —
      //    pruning can never ADD people.
      expect(pruned.nodes.length).toBeLessThanOrEqual(graph.nodes.length);

      // 5. Idempotent: pruning the already-pruned graph with the SAME
      //    collapsedIds again changes nothing further (every hidden id
      //    is already gone, so there's nothing left for it to find).
      const prunedAgain = pruneCollapsedDescendants(pruned, collapsedIds);
      expect(new Set(prunedAgain.nodes.map((n) => n.id))).toEqual(remainingIds);
    });
  }
});
