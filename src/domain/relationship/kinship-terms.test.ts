import { describe, expect, it } from "vitest";
import type { ParentChildRecord } from "./relationship.repository";
import { buildGenealogyGraph } from "./genealogy-graph";
import { findRelationshipPath } from "./genealogy-algorithms";
import {
  bloodKinTerm,
  describeKinship,
  describePathStops,
  type KinGender,
} from "./kinship-terms";

describe("bloodKinTerm", () => {
  it.each([
    [1, 0, "male", "отец"],
    [1, 0, "unknown", "родитель"],
    [2, 0, "female", "бабушка"],
    [4, 0, "male", "прапрадедушка"],
    [0, 1, "female", "дочь"],
    [0, 3, "male", "правнук"],
    [1, 1, "female", "сестра"],
    [2, 2, "male", "двоюродный брат"],
    [3, 3, "female", "троюродная сестра"],
    [7, 7, "male", "дальний брат"],
    [2, 1, "female", "тётя"],
    [3, 2, "male", "двоюродный дядя"],
    [3, 1, "male", "двоюродный дедушка"],
    [4, 2, "female", "троюродная бабушка"],
    [1, 2, "female", "племянница"],
    [2, 3, "male", "двоюродный племянник"],
    [1, 3, "male", "внучатый племянник"],
    [1, 4, "female", "правнучатая племянница"],
    [2, 2, "unknown", "двоюродный брат или сестра"],
  ] as const)("up=%i down=%i %s → %s", (up, down, gender, expected) => {
    expect(bloodKinTerm(up, down, gender, "ru")).toBe(expected);
  });
});

describe("bloodKinTerm (en)", () => {
  it.each([
    [1, 0, "male", "father"],
    [1, 0, "unknown", "parent"],
    [2, 0, "female", "grandmother"],
    [4, 0, "male", "great-great-grandfather"],
    [5, 0, "male", "3rd great-grandfather"],
    [0, 1, "female", "daughter"],
    [0, 3, "male", "great-grandson"],
    [1, 1, "female", "sister"],
    [1, 1, "unknown", "sibling"],
    [2, 2, "male", "first cousin"],
    [3, 3, "female", "second cousin"],
    [2, 1, "female", "aunt"],
    [3, 1, "male", "great-uncle"],
    [3, 2, "male", "first cousin once removed"],
    [4, 2, "female", "first cousin twice removed"],
    [1, 2, "female", "niece"],
    [1, 3, "male", "grandnephew"],
    [1, 4, "female", "great-grandniece"],
    [2, 1, "unknown", "uncle or aunt"],
  ] as const)("up=%i down=%i %s → %s", (up, down, gender, expected) => {
    expect(bloodKinTerm(up, down, gender, "en")).toBe(expected);
  });
});

/**
 * Фёдор → Иван → Павел → Анна, and Фёдор → Николай → Сергей → Мария:
 * Анна and Мария share a great-grandfather, so they're троюродные сёстры.
 */
function sokolovFamily() {
  const ids = ["fedor", "ivan", "nikolai", "pavel", "sergei", "anna", "maria"];
  const edge = (parentId: string, childId: string) =>
    ({
      id: `${parentId}-${childId}`,
      parentId,
      childId,
      parentRole: "biological",
    }) satisfies Pick<
      ParentChildRecord,
      "id" | "parentId" | "childId" | "parentRole"
    >;
  const graph = buildGenealogyGraph(
    ids.map((id) => ({ id })),
    [
      edge("fedor", "ivan"),
      edge("fedor", "nikolai"),
      edge("ivan", "pavel"),
      edge("nikolai", "sergei"),
      edge("pavel", "anna"),
      edge("sergei", "maria"),
    ],
    [{ person1Id: "pavel", person2Id: "elena" }],
  );
  const genders: Record<string, KinGender> = {
    fedor: "male",
    ivan: "male",
    nikolai: "male",
    pavel: "male",
    sergei: "male",
    anna: "female",
    maria: "female",
  };
  return { graph, genderOf: (id: string) => genders[id] ?? "unknown" };
}

describe("describeKinship", () => {
  it("names second cousins as a pair", () => {
    const { graph, genderOf } = sokolovFamily();
    const outcome = findRelationshipPath(graph, "anna", "maria");
    expect(describeKinship(outcome, genderOf, "ru")).toEqual({
      headline: "Троюродные сёстры",
      roles: null,
      detail: null,
    });
  });

  it("gives each side its own term when the relation isn't symmetric", () => {
    const { graph, genderOf } = sokolovFamily();
    const outcome = findRelationshipPath(graph, "nikolai", "pavel");
    expect(describeKinship(outcome, genderOf, "ru")).toEqual({
      headline: "Дядя и племянник",
      roles: { a: "дядя", b: "племянник" },
      detail: null,
    });
  });

  it("orders direct lineage from A's side", () => {
    const { graph, genderOf } = sokolovFamily();
    const outcome = findRelationshipPath(graph, "maria", "fedor");
    expect(describeKinship(outcome, genderOf, "ru").headline).toBe(
      "Правнучка и прадедушка",
    );
  });
});

describe("describeKinship (en)", () => {
  it("words pairs in English", () => {
    const { graph, genderOf } = sokolovFamily();
    expect(
      describeKinship(
        findRelationshipPath(graph, "anna", "maria"),
        genderOf,
        "en",
      ).headline,
    ).toBe("Second cousins");
    expect(
      describeKinship(
        findRelationshipPath(graph, "nikolai", "pavel"),
        genderOf,
        "en",
      ),
    ).toEqual({
      headline: "Uncle and nephew",
      roles: { a: "uncle", b: "nephew" },
      detail: null,
    });
  });
});

describe("describePathStops", () => {
  it("labels every stop relative to A and marks the shared ancestor", () => {
    const { graph, genderOf } = sokolovFamily();
    const outcome = findRelationshipPath(graph, "anna", "maria");
    if (outcome.status !== "found") throw new Error("expected a path");
    expect(
      describePathStops(outcome, genderOf, "ru").map((s) => [
        s.personId,
        s.via,
        s.role,
        s.isCommonAncestor,
      ]),
    ).toEqual([
      ["anna", null, null, false],
      ["pavel", "up", "отец", false],
      ["ivan", "up", "дедушка", false],
      ["fedor", "up", "прадедушка", true],
      ["nikolai", "down", "двоюродный дедушка", false],
      ["sergei", "down", "двоюродный дядя", false],
      ["maria", "down", "троюродная сестра", false],
    ]);
  });
});
