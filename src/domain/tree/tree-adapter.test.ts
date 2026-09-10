import { describe, expect, it } from "vitest";
import type { PersonRecord } from "@/domain/person/person.repository";
import { UNKNOWN_DATE } from "@/domain/shared/partial-date";
import { buildTreeLayout } from "./layout/layout";
import {
  toTreeFamilyGraph,
  fromTreeLayout,
  buildClientTreeLayout,
  type TreeClientGraphPayload,
} from "./tree-adapter";

function personRecord(
  id: string,
  overrides: Partial<PersonRecord> = {},
): PersonRecord {
  return {
    id,
    familyId: "family-1",
    slug: id,
    firstName: id,
    lastName: "Test",
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
    deathCause: null,
    description: null,
    religion: null,
    nationality: null,
    photoMediaId: null,
    privacyLevel: "family",
    createdBy: "user-1",
    createdAt: new Date("2020-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("toTreeFamilyGraph", () => {
  it("coerces null firstName/lastName to empty strings", () => {
    const { graph } = toTreeFamilyGraph({
      persons: [personRecord("a", { firstName: null, lastName: null })],
      parentChildEdges: [],
      partnershipEdges: [],
    });
    expect(graph.persons[0]).toMatchObject({
      id: "a",
      firstName: "",
      lastName: "",
    });
  });

  it("maps the 4 non-separated DB statuses through unchanged", () => {
    const statuses = ["married", "divorced", "widowed", "partnered"] as const;
    const { graph } = toTreeFamilyGraph({
      persons: [personRecord("a"), personRecord("b")],
      parentChildEdges: [],
      partnershipEdges: statuses.map((status, i) => ({
        id: `p-${i}`,
        person1Id: "a",
        person2Id: "b",
        status,
        isCurrent: true,
      })),
    });
    expect(graph.relationships.map((r) => r.status)).toEqual([...statuses]);
  });

  it('maps "separated" to "partnered" when isCurrent, "divorced" otherwise', () => {
    const { graph } = toTreeFamilyGraph({
      persons: [personRecord("a"), personRecord("b")],
      parentChildEdges: [],
      partnershipEdges: [
        {
          id: "p-current",
          person1Id: "a",
          person2Id: "b",
          status: "separated",
          isCurrent: true,
        },
        {
          id: "p-past",
          person1Id: "a",
          person2Id: "b",
          status: "separated",
          isCurrent: false,
        },
      ],
    });
    expect(graph.relationships.find((r) => r.id === "p-current")?.status).toBe(
      "partnered",
    );
    expect(graph.relationships.find((r) => r.id === "p-past")?.status).toBe(
      "divorced",
    );
  });

  it("maps relationship kinds and ids correctly", () => {
    const { graph } = toTreeFamilyGraph({
      persons: [personRecord("a"), personRecord("b"), personRecord("c")],
      parentChildEdges: [{ id: "pc-1", parentId: "a", childId: "c" }],
      partnershipEdges: [
        {
          id: "pt-1",
          person1Id: "a",
          person2Id: "b",
          status: "married",
          isCurrent: true,
        },
      ],
    });
    expect(graph.relationships).toEqual([
      { id: "pc-1", kind: "parent-child", from: "a", to: "c" },
      { id: "pt-1", kind: "spouse", from: "a", to: "b", status: "married" },
    ]);
  });

  it("personById covers every input person", () => {
    const { personById } = toTreeFamilyGraph({
      persons: [personRecord("a"), personRecord("b")],
      parentChildEdges: [],
      partnershipEdges: [],
    });
    expect(personById.size).toBe(2);
    expect(personById.get("a")?.id).toBe("a");
    expect(personById.get("b")?.id).toBe("b");
  });
});

describe("fromTreeLayout", () => {
  // A small representative family: 3 generations, one remarriage-shaped
  // partnership (status married but isCurrent:false), one solo parent.
  const grandpa = personRecord("grandpa", {
    firstName: "Grand",
    gender: "male",
  });
  const grandma = personRecord("grandma", {
    firstName: "Grandma",
    gender: "female",
  });
  const father = personRecord("father", {
    firstName: "Father",
    gender: "male",
  });
  const mother = personRecord("mother", {
    firstName: "Mother",
    gender: "female",
  });
  const focus = personRecord("focus", {
    firstName: "Focus",
    gender: "male",
    slug: "focus-slug",
    nickname: "Focusy",
    photoMediaId: "media-1",
    religion: "orthodox",
    nationality: "russian",
    birthDate: { ...UNKNOWN_DATE, year: 1990, precision: "year_only" },
  });
  const soloChild = personRecord("solo-child", { firstName: "Solo" });

  const persons = [grandpa, grandma, father, mother, focus, soloChild];
  const parentChildEdges = [
    { id: "pc-1", parentId: "grandpa", childId: "father" },
    { id: "pc-2", parentId: "grandma", childId: "father" },
    { id: "pc-3", parentId: "father", childId: "focus" },
    { id: "pc-4", parentId: "mother", childId: "focus" },
    { id: "pc-5", parentId: "father", childId: "solo-child" },
  ];
  const partnershipEdges = [
    {
      id: "partnership-grandparents",
      person1Id: "grandpa",
      person2Id: "grandma",
      status: "married" as const,
      isCurrent: true,
    },
    {
      id: "partnership-parents",
      person1Id: "father",
      person2Id: "mother",
      status: "married" as const,
      isCurrent: false, // divorced-in-spirit, but status stayed "married" in DB
    },
  ];

  function run() {
    const { graph, personById } = toTreeFamilyGraph({
      persons,
      parentChildEdges,
      partnershipEdges,
    });
    const result = buildTreeLayout(graph, "focus");
    const partnershipIsCurrentById = new Map(
      partnershipEdges.map((p) => [p.id, p.isCurrent]),
    );
    return fromTreeLayout(
      "focus",
      result,
      personById,
      parentChildEdges,
      partnershipIsCurrentById,
    );
  }

  it("produces one node per person", () => {
    const layoutGraph = run();
    expect(layoutGraph.nodes).toHaveLength(persons.length);
  });

  it("joins the full PersonRecord fields back onto each node", () => {
    const layoutGraph = run();
    const focusNode = layoutGraph.nodes.find((n) => n.id === "focus")!;
    expect(focusNode.person).toEqual({
      id: "focus",
      slug: "focus-slug",
      firstName: "Focus",
      lastName: "Test",
      nickname: "Focusy",
      isPlaceholder: false,
      isLiving: true,
      birthYear: 1990,
      deathYear: null,
      photoMediaId: "media-1",
      gender: "male",
      religion: "orthodox",
      nationality: "russian",
    });
  });

  it("marks the focus node correctly (generation 0, isFocus true)", () => {
    const layoutGraph = run();
    const focusNode = layoutGraph.nodes.find((n) => n.id === "focus")!;
    expect(focusNode.generation).toBe(0);
    expect(focusNode.isFocus).toBe(true);
    expect(layoutGraph.nodes.filter((n) => n.isFocus)).toHaveLength(1);
  });

  it("builds one parent_child edge per DB row", () => {
    const layoutGraph = run();
    const parentChild = layoutGraph.edges.filter(
      (e) => e.kind === "parent_child",
    );
    expect(parentChild).toHaveLength(parentChildEdges.length);
  });

  it("builds one partnership edge per engine-recognized couple, preserving isCurrent losslessly from the DB row (not derived from the coerced status)", () => {
    const layoutGraph = run();
    const partnerships = layoutGraph.edges.filter(
      (e) => e.kind === "partnership",
    );
    expect(partnerships.length).toBeGreaterThan(0);

    const parentsPartnership = partnerships.find(
      (e) =>
        (e.source === "father" && e.target === "mother") ||
        (e.source === "mother" && e.target === "father"),
    );
    // status stayed "married" (not coerced — only "separated" is coerced),
    // but isCurrent must still come through as false, from the DB row, not
    // inferred from status.
    expect(parentsPartnership?.isCurrent).toBe(false);

    const grandparentsPartnership = partnerships.find(
      (e) =>
        (e.source === "grandpa" && e.target === "grandma") ||
        (e.source === "grandma" && e.target === "grandpa"),
    );
    expect(grandparentsPartnership?.isCurrent).toBe(true);
  });

  it("scales a known partner pair's horizontal distance to exactly PROD_PARTNER_X_SPACING (184)", () => {
    const layoutGraph = run();
    const a = layoutGraph.nodes.find((n) => n.id === "grandpa")!;
    const b = layoutGraph.nodes.find((n) => n.id === "grandma")!;
    expect(Math.abs(a.x - b.x)).toBeCloseTo(184, 5);
  });

  it("throws a clear error if a laid-out person is missing from personById (adapter bug guard)", () => {
    const { graph } = toTreeFamilyGraph({
      persons,
      parentChildEdges,
      partnershipEdges,
    });
    const result = buildTreeLayout(graph, "focus");
    const emptyPersonById = new Map<string, PersonRecord>();
    expect(() =>
      fromTreeLayout(
        "focus",
        result,
        emptyPersonById,
        parentChildEdges,
        new Map(),
      ),
    ).toThrow(/missing from personById/);
  });
});

describe("buildClientTreeLayout (rewrite plan §7 Stage 7 — client-side focus switch)", () => {
  // Same 3-generation family as the "fromTreeLayout — full pipeline" block
  // above (grandpa/grandma -> parent(+spouse) -> child), rebuilt directly
  // as a TreeClientGraphPayload (the narrow, client-safe shape) rather than
  // full PersonRecord[] — exercising the actual boundary this function
  // crosses (getRawTreeGraph's own output shape), not just a widened
  // PersonRecord[] that happens to satisfy the same interface.
  function clientPayload(): TreeClientGraphPayload {
    const ids = ["grandpa", "grandma", "parent", "spouse", "child"];
    return {
      persons: ids.map((id) => ({
        id,
        slug: id,
        firstName: id,
        lastName: "Test",
        nickname: null,
        gender: "unknown",
        isPlaceholder: false,
        isLiving: true,
        birthDate: null,
        deathDate: null,
        photoMediaId: null,
        religion: null,
        nationality: null,
      })),
      parentChildEdges: [
        { id: "pc-1", parentId: "grandpa", childId: "parent" },
        { id: "pc-2", parentId: "grandma", childId: "parent" },
        { id: "pc-3", parentId: "parent", childId: "child" },
        { id: "pc-4", parentId: "spouse", childId: "child" },
      ],
      partnershipEdges: [
        {
          id: "rel-1",
          person1Id: "grandpa",
          person2Id: "grandma",
          status: "married",
          isCurrent: true,
        },
        {
          id: "rel-2",
          person1Id: "parent",
          person2Id: "spouse",
          status: "married",
          isCurrent: true,
        },
      ],
    };
  }

  it("produces a graph focused on whichever personId is passed, not the original graph's own root", () => {
    const layout = buildClientTreeLayout(clientPayload(), "grandpa");
    expect(layout.focusPersonId).toBe("grandpa");
    const grandpaNode = layout.nodes.find((n) => n.id === "grandpa")!;
    expect(grandpaNode.isFocus).toBe(true);
    const childNode = layout.nodes.find((n) => n.id === "child")!;
    expect(childNode.isFocus).toBe(false);
  });

  it("includes every person from the payload regardless of which one is focused — buildTreeLayout always lays out the whole connected family", () => {
    const focusedOnChild = buildClientTreeLayout(clientPayload(), "child");
    const focusedOnGrandpa = buildClientTreeLayout(clientPayload(), "grandpa");
    const idsFromChild = new Set(focusedOnChild.nodes.map((n) => n.id));
    const idsFromGrandpa = new Set(focusedOnGrandpa.nodes.map((n) => n.id));
    expect(idsFromChild).toEqual(idsFromGrandpa);
    expect(idsFromChild).toEqual(
      new Set(["grandpa", "grandma", "parent", "spouse", "child"]),
    );
  });

  it("re-centers the NEW focus person at x=0 (matches getFocusTreeLayout's own focus-at-origin invariant)", () => {
    const layout = buildClientTreeLayout(clientPayload(), "child");
    const childNode = layout.nodes.find((n) => n.id === "child")!;
    // "child" has a spouse-less single partnership branch of their own?
    // No — child is childless here, so their own card sits exactly at x=0,
    // same invariant buildTreeLayout guarantees for any focus with no
    // partnership of their own centering the pair instead.
    expect(childNode.x).toBeCloseTo(0, 5);
  });

  it("preserves each person's display data (slug/name/photo) across the client-side rebuild, same as fromTreeLayout's server-side path", () => {
    const layout = buildClientTreeLayout(clientPayload(), "parent");
    const grandpaNode = layout.nodes.find((n) => n.id === "grandpa")!;
    expect(grandpaNode.person).toMatchObject({
      id: "grandpa",
      slug: "grandpa",
      firstName: "grandpa",
      lastName: "Test",
    });
  });

  it("throws the same clear layout-engine error getFocusTreeLayout's own try/catch would surface, for an unknown focusPersonId", () => {
    expect(() =>
      buildClientTreeLayout(clientPayload(), "nonexistent-person"),
    ).toThrow();
  });
});
