import { describe, expect, it } from "vitest";
import { buildGenealogyGraph } from "./genealogy-graph";
import { validateGenealogyGraph } from "./genealogy-validation";
import type { PersonRecord } from "@/domain/person/person.repository";
import type { PartialDate } from "@/domain/shared/partial-date";
import type {
  ParentChildRecord,
  PartnershipRecord,
} from "./relationship.repository";

function date(year: number): PartialDate {
  return {
    year,
    month: null,
    day: null,
    precision: "year_only",
    isApproximate: false,
  };
}

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

function pc(parentId: string, childId: string): ParentChildRecord {
  return {
    id: `${parentId}-${childId}`,
    familyId: "family-1",
    parentId,
    childId,
    parentRole: "biological",
  };
}

function partner(
  person1Id: string,
  person2Id: string,
  id = `${person1Id}-${person2Id}`,
): PartnershipRecord {
  return {
    id,
    familyId: "family-1",
    person1Id,
    person2Id,
    status: "married",
    startDate: null,
    endDate: null,
    isCurrent: true,
  };
}

describe("validateGenealogyGraph — structural errors", () => {
  it("reports no issues for a clean, unremarkable family", () => {
    const graph = buildGenealogyGraph(
      [
        person("mother", { birthDate: date(1950) }),
        person("father", { birthDate: date(1948) }),
        person("child", { birthDate: date(1975) }),
      ],
      [pc("mother", "child"), pc("father", "child")],
      [partner("mother", "father")],
    );
    expect(validateGenealogyGraph(graph)).toEqual([]);
  });

  it("detects a 2-node cycle (A is B's parent and B is A's parent)", () => {
    const graph = buildGenealogyGraph(
      [person("a"), person("b")],
      [pc("a", "b"), pc("b", "a")],
      [],
    );
    const issues = validateGenealogyGraph(graph);
    expect(issues).toContainEqual(
      expect.objectContaining({ kind: "self_parent_cycle", severity: "error" }),
    );
  });

  it("detects a longer cycle (A -> B -> C -> A)", () => {
    const graph = buildGenealogyGraph(
      [person("a"), person("b"), person("c")],
      [pc("a", "b"), pc("b", "c"), pc("c", "a")],
      [],
    );
    const issues = validateGenealogyGraph(graph);
    const cycleIssue = issues.find((i) => i.kind === "self_parent_cycle");
    expect(cycleIssue).toBeDefined();
    expect(cycleIssue?.personIds).toEqual(
      expect.arrayContaining(["a", "b", "c"]),
    );
  });

  it("reports no cycle for a normal acyclic multi-generation tree", () => {
    const graph = buildGenealogyGraph(
      [person("grandparent"), person("parent"), person("child")],
      [pc("grandparent", "parent"), pc("parent", "child")],
      [],
    );
    expect(
      validateGenealogyGraph(graph).filter(
        (i) => i.kind === "self_parent_cycle",
      ),
    ).toEqual([]);
  });

  it("detects a duplicated parent_child edge", () => {
    const graph = buildGenealogyGraph(
      [person("parent"), person("child")],
      [pc("parent", "child"), pc("parent", "child")],
      [],
    );
    expect(validateGenealogyGraph(graph)).toContainEqual(
      expect.objectContaining({
        kind: "duplicate_parent_child",
        severity: "error",
      }),
    );
  });

  it("does NOT flag two partnership rows for the same pair as duplicates (divorce + remarriage)", () => {
    const graph = buildGenealogyGraph(
      [person("a"), person("b")],
      [],
      [partner("a", "b", "row-1"), partner("a", "b", "row-2")],
    );
    expect(
      validateGenealogyGraph(graph).filter(
        (i) => i.kind === "duplicate_partnership",
      ),
    ).toEqual([]);
  });
});

describe("validateGenealogyGraph — date plausibility warnings", () => {
  it("warns (not errors) when a child's birth year is not after the parent's", () => {
    const graph = buildGenealogyGraph(
      [
        person("parent", { birthDate: date(1990) }),
        person("child", { birthDate: date(1985) }),
      ],
      [pc("parent", "child")],
      [],
    );
    const issues = validateGenealogyGraph(graph);
    expect(issues).toContainEqual(
      expect.objectContaining({
        kind: "child_older_than_parent",
        severity: "warning",
      }),
    );
  });

  it("warns when a parent was implausibly young at a child's birth", () => {
    const graph = buildGenealogyGraph(
      [
        person("parent", { birthDate: date(2000) }),
        person("child", { birthDate: date(2005) }),
      ],
      [pc("parent", "child")],
      [],
    );
    expect(validateGenealogyGraph(graph)).toContainEqual(
      expect.objectContaining({
        kind: "parent_too_young",
        severity: "warning",
      }),
    );
  });

  it("warns when death year precedes birth year", () => {
    const graph = buildGenealogyGraph(
      [person("a", { birthDate: date(1950), deathDate: date(1940) })],
      [],
      [],
    );
    expect(validateGenealogyGraph(graph)).toContainEqual(
      expect.objectContaining({
        kind: "death_before_birth",
        severity: "warning",
      }),
    );
  });

  it("does not warn when dates are simply unknown (missing is not a violation)", () => {
    const graph = buildGenealogyGraph(
      [person("parent"), person("child")], // no birth/death dates at all
      [pc("parent", "child")],
      [],
    );
    expect(validateGenealogyGraph(graph)).toEqual([]);
  });

  it("does not warn for a plausible, well-spaced birth gap", () => {
    const graph = buildGenealogyGraph(
      [
        person("parent", { birthDate: date(1960) }),
        person("child", { birthDate: date(1990) }),
      ],
      [pc("parent", "child")],
      [],
    );
    expect(validateGenealogyGraph(graph)).toEqual([]);
  });
});
