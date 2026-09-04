import { describe, expect, it } from "vitest";
import { buildGenealogyGraph, getPerson } from "./genealogy-graph";
import type { PersonRecord } from "@/domain/person/person.repository";
import type {
  ParentChildRecord,
  PartnershipRecord,
} from "./relationship.repository";

function person(
  id: string,
  overrides: Partial<PersonRecord> = {},
): PersonRecord {
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
    deathCause: null,
    description: null,
    religion: null,
    nationality: null,
    photoMediaId: null,
    privacyLevel: "family",
    createdBy: "user-1",
    ...overrides,
  };
}

function parentChild(
  parentId: string,
  childId: string,
  parentRole: ParentChildRecord["parentRole"] = "biological",
): ParentChildRecord {
  return {
    id: `${parentId}-${childId}`,
    familyId: "family-1",
    parentId,
    childId,
    parentRole,
  };
}

function partnership(
  person1Id: string,
  person2Id: string,
  overrides: Partial<PartnershipRecord> = {},
): PartnershipRecord {
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

describe("buildGenealogyGraph", () => {
  it("indexes every person by id", () => {
    const graph = buildGenealogyGraph([person("alice"), person("bob")], [], []);
    expect(getPerson(graph, "alice")?.id).toBe("alice");
    expect(getPerson(graph, "bob")?.id).toBe("bob");
    expect(getPerson(graph, "ghost")).toBeNull();
  });

  it("indexes parent_child edges from both the child and the parent side", () => {
    const graph = buildGenealogyGraph(
      [person("mother"), person("father"), person("alice")],
      [parentChild("mother", "alice"), parentChild("father", "alice")],
      [],
    );

    expect(graph.parentEdgesOf.get("alice")).toHaveLength(2);
    expect(
      graph.parentEdgesOf
        .get("alice")
        ?.map((e) => e.parentId)
        .sort(),
    ).toEqual(["father", "mother"]);
    expect(graph.childEdgesOf.get("mother")).toEqual([
      parentChild("mother", "alice"),
    ]);
    expect(graph.childEdgesOf.get("father")).toEqual([
      parentChild("father", "alice"),
    ]);
    // No edges recorded on the wrong side.
    expect(graph.parentEdgesOf.get("mother")).toBeUndefined();
    expect(graph.childEdgesOf.get("alice")).toBeUndefined();
  });

  it("preserves parentRole on parent_child edges (biological/adoptive/step/foster/unknown)", () => {
    const graph = buildGenealogyGraph(
      [person("stepparent"), person("child")],
      [parentChild("stepparent", "child", "step")],
      [],
    );
    expect(graph.parentEdgesOf.get("child")?.[0].parentRole).toBe("step");
  });

  it("indexes partnership edges under both partners", () => {
    const graph = buildGenealogyGraph(
      [person("alice"), person("bob")],
      [],
      [partnership("alice", "bob")],
    );
    expect(graph.partnershipEdgesOf.get("alice")).toHaveLength(1);
    expect(graph.partnershipEdgesOf.get("bob")).toHaveLength(1);
    expect(graph.partnershipEdgesOf.get("alice")?.[0].id).toBe(
      graph.partnershipEdgesOf.get("bob")?.[0].id,
    );
  });

  it("supports multiple partnerships for the same person (divorce + remarriage)", () => {
    const graph = buildGenealogyGraph(
      [person("alice"), person("bob"), person("carl")],
      [],
      [
        partnership("alice", "bob", { status: "divorced", isCurrent: false }),
        partnership("alice", "carl", { status: "married", isCurrent: true }),
      ],
    );
    expect(graph.partnershipEdgesOf.get("alice")).toHaveLength(2);
    expect(graph.partnershipEdgesOf.get("bob")).toHaveLength(1);
    expect(graph.partnershipEdgesOf.get("carl")).toHaveLength(1);
  });

  it("handles an empty family gracefully", () => {
    const graph = buildGenealogyGraph([], [], []);
    expect(graph.personsById.size).toBe(0);
    expect(graph.parentEdgesOf.size).toBe(0);
    expect(graph.childEdgesOf.size).toBe(0);
    expect(graph.partnershipEdgesOf.size).toBe(0);
  });

  it("supports more than two parents recorded for the same child", () => {
    const graph = buildGenealogyGraph(
      [
        person("bio-mother"),
        person("bio-father"),
        person("stepmother"),
        person("child"),
      ],
      [
        parentChild("bio-mother", "child", "biological"),
        parentChild("bio-father", "child", "biological"),
        parentChild("stepmother", "child", "step"),
      ],
      [],
    );
    expect(graph.parentEdgesOf.get("child")).toHaveLength(3);
  });
});
