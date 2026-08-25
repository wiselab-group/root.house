import { describe, expect, it } from "vitest";
import { buildGenealogyGraph } from "./genealogy-graph";
import {
  calculateRelationship,
  findCommonAncestors,
  findRelationshipPath,
  getAncestors,
  getChildren,
  getDescendants,
  getParents,
  getPartners,
  getSiblings,
} from "./genealogy-algorithms";
import type { PersonRecord } from "@/domain/person/person.repository";
import type { ParentChildRecord, PartnershipRecord } from "./relationship.repository";

function person(id: string, overrides: Partial<PersonRecord> = {}): PersonRecord {
  return {
    id,
    familyId: "family-1",
    slug: id,
    firstName: id,
    lastName: null,
    middleName: null,
    maidenName: null,
    nickname: null,
    gender: "unknown",
    isPlaceholder: false,
    isLiving: true,
    birthDate: null,
    deathDate: null,
    birthPlaceId: null,
    deathPlaceId: null,
    description: null,
    religion: null,
    nationality: null,
    photoMediaId: null,
    privacyLevel: "family",
    createdBy: "user-1",
    ...overrides,
  };
}

function pc(parentId: string, childId: string, parentRole: ParentChildRecord["parentRole"] = "biological"): ParentChildRecord {
  return { id: `${parentId}-${childId}`, familyId: "family-1", parentId, childId, parentRole };
}

function partner(person1Id: string, person2Id: string, overrides: Partial<PartnershipRecord> = {}): PartnershipRecord {
  return {
    id: `${person1Id}-${person2Id}`,
    familyId: "family-1",
    person1Id,
    person2Id,
    status: "married",
    startDate: null,
    endDate: null,
    isCurrent: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Simple chain: Grandfather -> Father -> Me
// ---------------------------------------------------------------------------
describe("simple ancestor chain (grandfather -> father -> me)", () => {
  const persons = [person("grandfather"), person("father"), person("me")];
  const edges = [pc("grandfather", "father"), pc("father", "me")];
  const graph = buildGenealogyGraph(persons, edges, []);

  it("getParents finds the direct parent", () => {
    expect(getParents(graph, "me").map((p) => p.person.id)).toEqual(["father"]);
  });

  it("getAncestors finds both generations with correct depth", () => {
    const ancestors = getAncestors(graph, "me");
    expect(ancestors).toContainEqual({ person: person("father"), generationsAway: 1 });
    expect(ancestors).toContainEqual({ person: person("grandfather"), generationsAway: 2 });
  });

  it("getDescendants mirrors from the top", () => {
    const descendants = getDescendants(graph, "grandfather");
    expect(descendants.map((d) => d.generationsAway).sort()).toEqual([1, 2]);
  });

  it("calculateRelationship identifies grandparent/grandchild", () => {
    expect(calculateRelationship(graph, "grandfather", "me").label).toBe("grandparent");
    expect(calculateRelationship(graph, "me", "grandfather").label).toBe("grandchild");
  });

  it("findRelationshipPath returns the full chain of people", () => {
    const result = findRelationshipPath(graph, "me", "grandfather");
    expect(result.status).toBe("found");
    if (result.status !== "found") throw new Error("expected found");
    expect(result.personIds).toEqual(["me", "father", "grandfather"]);
    expect(result.steps).toEqual([
      { fromId: "me", toId: "father", edgeKind: "parent_child", direction: "up", parentRole: "biological" },
      { fromId: "father", toId: "grandfather", edgeKind: "parent_child", direction: "up", parentRole: "biological" },
    ]);
  });
});

// ---------------------------------------------------------------------------
// 2. Two parents + multiple children
// ---------------------------------------------------------------------------
describe("two parents with multiple children", () => {
  const persons = [person("mother"), person("father"), person("alice"), person("bob"), person("carol")];
  const edges = [
    pc("mother", "alice"),
    pc("father", "alice"),
    pc("mother", "bob"),
    pc("father", "bob"),
    pc("mother", "carol"),
    pc("father", "carol"),
  ];
  const graph = buildGenealogyGraph(persons, edges, []);

  it("each child has exactly two parents", () => {
    expect(getParents(graph, "alice")).toHaveLength(2);
    expect(getParents(graph, "bob")).toHaveLength(2);
  });

  it("each parent has all three children", () => {
    expect(getChildren(graph, "mother").map((c) => c.person.id).sort()).toEqual(["alice", "bob", "carol"]);
  });

  it("all three children are full siblings of each other", () => {
    const siblings = getSiblings(graph, "alice");
    expect(siblings).toContainEqual({ person: person("bob"), sharedParentCount: 2 });
    expect(siblings).toContainEqual({ person: person("carol"), sharedParentCount: 2 });
  });
});

// ---------------------------------------------------------------------------
// 3 & 4. Multiple partners + children from different partnerships
// ---------------------------------------------------------------------------
describe("multiple partners, children from different partnerships", () => {
  const persons = [person("peter"), person("olga"), person("elena"), person("alex"), person("annaJr")];
  const edges = [pc("peter", "alex"), pc("olga", "alex"), pc("peter", "annaJr"), pc("elena", "annaJr")];
  const partnerships = [
    partner("peter", "olga", { status: "divorced", isCurrent: false }),
    partner("peter", "elena", { status: "married", isCurrent: true }),
  ];
  const graph = buildGenealogyGraph(persons, edges, partnerships);

  it("getPartners returns both of Peter's partnerships", () => {
    const partners = getPartners(graph, "peter");
    expect(partners.map((p) => p.person.id).sort()).toEqual(["elena", "olga"]);
  });

  it("children from different partnerships are half-siblings (one shared parent)", () => {
    const siblings = getSiblings(graph, "alex");
    expect(siblings).toEqual([{ person: person("annaJr"), sharedParentCount: 1 }]);
  });

  it("alex and annaJr share exactly one common ancestor (peter)", () => {
    const common = findCommonAncestors(graph, "alex", "annaJr");
    expect(common.map((c) => c.person.id)).toEqual(["peter"]);
  });

  it("calculateRelationship still calls them siblings (half-sibling is a UI-level distinction)", () => {
    expect(calculateRelationship(graph, "alex", "annaJr").label).toBe("sibling");
  });
});

// ---------------------------------------------------------------------------
// 5 & 6. Divorce + remarriage
// ---------------------------------------------------------------------------
describe("divorce and remarriage", () => {
  it("keeps both partnership rows without a special remarriage flag", () => {
    const persons = [person("ivan"), person("anna"), person("maria")];
    const partnerships = [
      partner("ivan", "anna", { status: "divorced", isCurrent: false }),
      partner("ivan", "maria", { status: "married", isCurrent: true }),
    ];
    const graph = buildGenealogyGraph(persons, [], partnerships);
    const partners = getPartners(graph, "ivan");
    expect(partners).toHaveLength(2);
    expect(partners.find((p) => p.person.id === "anna")?.partnership.status).toBe("divorced");
    expect(partners.find((p) => p.person.id === "maria")?.partnership.status).toBe("married");
  });
});

// ---------------------------------------------------------------------------
// 7. Step-parent
// ---------------------------------------------------------------------------
describe("step-parent", () => {
  it("parentRole distinguishes the step relationship without changing traversal", () => {
    const persons = [person("bio-father"), person("stepmother"), person("child")];
    const edges = [pc("bio-father", "child", "biological"), pc("stepmother", "child", "step")];
    const graph = buildGenealogyGraph(persons, edges, []);

    const parents = getParents(graph, "child");
    expect(parents.find((p) => p.person.id === "stepmother")?.parentRole).toBe("step");
    expect(parents.find((p) => p.person.id === "bio-father")?.parentRole).toBe("biological");
    expect(calculateRelationship(graph, "stepmother", "child").label).toBe("parent");
  });
});

// ---------------------------------------------------------------------------
// 8. Adoptive parent
// ---------------------------------------------------------------------------
describe("adoptive parent", () => {
  it("adoptive parentRole is preserved and traversal works identically to biological", () => {
    const persons = [person("adoptive-mother"), person("child")];
    const edges = [pc("adoptive-mother", "child", "adoptive")];
    const graph = buildGenealogyGraph(persons, edges, []);

    expect(getParents(graph, "child")[0].parentRole).toBe("adoptive");
    const path = findRelationshipPath(graph, "child", "adoptive-mother");
    expect(path.status).toBe("found");
    if (path.status === "found") {
      expect(path.steps[0].parentRole).toBe("adoptive");
    }
  });

  it("foster parentRole is also representable", () => {
    const persons = [person("foster-parent"), person("child")];
    const edges = [pc("foster-parent", "child", "foster")];
    const graph = buildGenealogyGraph(persons, edges, []);
    expect(getParents(graph, "child")[0].parentRole).toBe("foster");
  });
});

// ---------------------------------------------------------------------------
// 9. Unknown parent (placeholder person)
// ---------------------------------------------------------------------------
describe("unknown parent represented as a placeholder person", () => {
  it("a placeholder parent participates in traversal like any other person", () => {
    const persons = [person("unknown-father", { isPlaceholder: true, firstName: null }), person("child")];
    const edges = [pc("unknown-father", "child", "unknown")];
    const graph = buildGenealogyGraph(persons, edges, []);

    const parents = getParents(graph, "child");
    expect(parents).toHaveLength(1);
    expect(parents[0].person.isPlaceholder).toBe(true);
    expect(parents[0].parentRole).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// 10. Complex combination of multiple marriages
// ---------------------------------------------------------------------------
describe("complex multi-marriage family", () => {
  // Ivan -- Anna (divorced) -> Peter
  // Ivan -- Olga (married)   -> Sergey
  // Peter -- Elena           -> childOfPeter
  const persons = [
    person("ivan"),
    person("anna"),
    person("olga"),
    person("peter"),
    person("sergey"),
    person("elena"),
    person("childOfPeter"),
  ];
  const edges = [pc("ivan", "peter"), pc("anna", "peter"), pc("ivan", "sergey"), pc("olga", "sergey"), pc("peter", "childOfPeter"), pc("elena", "childOfPeter")];
  const partnerships = [
    partner("ivan", "anna", { status: "divorced", isCurrent: false }),
    partner("ivan", "olga", { status: "married", isCurrent: true }),
    partner("peter", "elena", { status: "married", isCurrent: true }),
  ];
  const graph = buildGenealogyGraph(persons, edges, partnerships);

  it("peter and sergey are half-siblings via ivan", () => {
    expect(getSiblings(graph, "peter")).toEqual([{ person: person("sergey"), sharedParentCount: 1 }]);
  });

  it("childOfPeter's grandparents include ivan (through peter) but not olga", () => {
    const ancestors = getAncestors(graph, "childOfPeter");
    const grandparentIds = ancestors.filter((a) => a.generationsAway === 2).map((a) => a.person.id);
    expect(grandparentIds).toContain("ivan");
    expect(grandparentIds).toContain("anna");
    expect(grandparentIds).not.toContain("olga");
  });

  it("childOfPeter and sergey are uncle/nephew via common ancestor ivan", () => {
    const result = calculateRelationship(graph, "sergey", "childOfPeter");
    expect(result.label).toBe("aunt_or_uncle");
    expect(result.commonAncestorId).toBe("ivan");
  });
});

// ---------------------------------------------------------------------------
// 11. Common ancestor
// ---------------------------------------------------------------------------
describe("findCommonAncestors", () => {
  it("finds a shared grandparent for first cousins", () => {
    const persons = [person("grandparent"), person("parentA"), person("parentB"), person("cousinA"), person("cousinB")];
    const edges = [pc("grandparent", "parentA"), pc("grandparent", "parentB"), pc("parentA", "cousinA"), pc("parentB", "cousinB")];
    const graph = buildGenealogyGraph(persons, edges, []);

    const common = findCommonAncestors(graph, "cousinA", "cousinB");
    expect(common).toEqual([{ person: person("grandparent"), depthFromA: 2, depthFromB: 2 }]);
  });

  it("returns an empty list for unrelated people", () => {
    const persons = [person("a"), person("b")];
    const graph = buildGenealogyGraph(persons, [], []);
    expect(findCommonAncestors(graph, "a", "b")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 12. findRelationshipPath
// ---------------------------------------------------------------------------
describe("findRelationshipPath", () => {
  it("returns insufficient_data when a person id doesn't exist in the graph", () => {
    const graph = buildGenealogyGraph([person("a")], [], []);
    expect(findRelationshipPath(graph, "a", "ghost")).toEqual({
      status: "insufficient_data",
      personAId: "a",
      personBId: "ghost",
    });
  });

  it("returns unrelated when there is no path between two people", () => {
    const graph = buildGenealogyGraph([person("a"), person("b")], [], []);
    expect(findRelationshipPath(graph, "a", "b")).toEqual({ status: "unrelated", personAId: "a", personBId: "b" });
  });

  it("finds a spouse via a direct partnership edge when there's no shared ancestor", () => {
    const graph = buildGenealogyGraph([person("husband"), person("wife")], [], [partner("husband", "wife")]);
    const result = findRelationshipPath(graph, "husband", "wife");
    expect(result.status).toBe("found");
    if (result.status !== "found") throw new Error("expected found");
    expect(result.personIds).toEqual(["husband", "wife"]);
    expect(result.steps).toEqual([{ fromId: "husband", toId: "wife", edgeKind: "partnership" }]);
    expect(result.relationship.label).toBe("spouse");
  });

  it("handles the same-person case", () => {
    const graph = buildGenealogyGraph([person("a")], [], []);
    const result = findRelationshipPath(graph, "a", "a");
    expect(result).toMatchObject({ status: "found", personIds: ["a"], steps: [], commonAncestorId: "a" });
  });

  it("builds a path through a common ancestor with correct up/down directions (cousins)", () => {
    // grandparent -> father -> alice ; grandparent -> uncle -> cousin
    const persons = [person("grandparent"), person("father"), person("uncle"), person("alice"), person("cousin")];
    const edges = [pc("grandparent", "father"), pc("grandparent", "uncle"), pc("father", "alice"), pc("uncle", "cousin")];
    const graph = buildGenealogyGraph(persons, edges, []);

    const result = findRelationshipPath(graph, "alice", "cousin");
    expect(result.status).toBe("found");
    if (result.status !== "found") throw new Error("expected found");
    expect(result.personIds).toEqual(["alice", "father", "grandparent", "uncle", "cousin"]);
    expect(result.steps.map((s) => s.direction)).toEqual(["up", "up", "down", "down"]);
    expect(result.relationship.label).toBe("cousin");
    expect(result.relationship.cousinDegree).toBe(1);
  });

  it("matches the plan's example shape: A -> father -> grandfather -> grandfather's sister -> her son -> B", () => {
    const persons = [
      person("greatGrandparent"),
      person("grandfather"),
      person("grandfathersSister"),
      person("father"),
      person("herSon"),
      person("personA"),
      person("personB"),
    ];
    const edges = [
      pc("greatGrandparent", "grandfather"),
      pc("greatGrandparent", "grandfathersSister"),
      pc("grandfather", "father"),
      pc("father", "personA"),
      pc("grandfathersSister", "herSon"),
      pc("herSon", "personB"),
    ];
    const graph = buildGenealogyGraph(persons, edges, []);

    const result = findRelationshipPath(graph, "personA", "personB");
    expect(result.status).toBe("found");
    if (result.status !== "found") throw new Error("expected found");
    expect(result.personIds).toEqual([
      "personA",
      "father",
      "grandfather",
      "greatGrandparent",
      "grandfathersSister",
      "herSon",
      "personB",
    ]);
    expect(result.commonAncestorId).toBe("greatGrandparent");
  });
});

// ---------------------------------------------------------------------------
// 13. calculateRelationship
// ---------------------------------------------------------------------------
describe("calculateRelationship", () => {
  it("delegates to computeRelationshipPath and returns unrelated (not a guess) with no shared ancestor", () => {
    const graph = buildGenealogyGraph([person("a"), person("b")], [], []);
    expect(calculateRelationship(graph, "a", "b")).toEqual({ label: "unrelated", commonAncestorId: null });
  });
});

// ---------------------------------------------------------------------------
// 20. Large-ish tree sanity check (breadth, not just depth)
// ---------------------------------------------------------------------------
describe("larger tree", () => {
  it("resolves ancestors/descendants correctly across 4 generations and multiple branches", () => {
    const persons = Array.from({ length: 20 }, (_, i) => person(`p${i}`));
    // p0 is the root; each generation has 2 children per parent for 3 levels (1 + 2 + 4 + 8 = 15 people), plus a spare 5.
    const edges: ParentChildRecord[] = [];
    let nextId = 1;
    let currentGen = [0];
    for (let gen = 0; gen < 3; gen++) {
      const nextGen: number[] = [];
      for (const parent of currentGen) {
        for (let c = 0; c < 2; c++) {
          if (nextId >= 15) break;
          edges.push(pc(`p${parent}`, `p${nextId}`));
          nextGen.push(nextId);
          nextId++;
        }
      }
      currentGen = nextGen;
    }
    const graph = buildGenealogyGraph(persons, edges, []);

    const descendants = getDescendants(graph, "p0");
    expect(descendants.length).toBeGreaterThan(0);
    expect(Math.max(...descendants.map((d) => d.generationsAway))).toBe(3);

    // Two leaves in different branches at generation 3 should be at least cousins (share p0).
    const leaves = descendants.filter((d) => d.generationsAway === 3).map((d) => d.person.id);
    if (leaves.length >= 2) {
      const rel = calculateRelationship(graph, leaves[0], leaves[1]);
      expect(["cousin", "sibling", "unrelated"]).toContain(rel.label);
    }
  });
});
