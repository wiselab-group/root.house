import type { FamilyGraph, Gender, Relationship } from "./types";

/**
 * Synthetic test graphs — small, purpose-built fixtures covering the
 * scenarios the real (minimal) fixture.ts data is too small to exercise:
 * ancestors, siblings, divorce, remarriage, large asymmetric branches, deep
 * multi-generation chains. Named CASE 1-10, matching the design brief.
 */

export function person(
  id: string,
  gender: Gender = "unknown",
  first?: string,
  last?: string,
) {
  return { id, firstName: first ?? id, lastName: last ?? "", gender };
}

export function spouse(
  id: string,
  from: string,
  to: string,
  status: Relationship["status"] = "married",
): Relationship {
  return { id, kind: "spouse", from, to, status };
}

export function parentChild(
  id: string,
  from: string,
  to: string,
): Relationship {
  return { id, kind: "parent-child", from, to };
}

/** CASE 1: A + B -> C, D, E (simple nuclear family, three children). */
export const case1SimpleFamily: FamilyGraph = {
  persons: [
    person("a", "male"),
    person("b", "female"),
    person("c", "unknown"),
    person("d", "unknown"),
    person("e", "unknown"),
  ],
  relationships: [
    spouse("ab", "a", "b"),
    parentChild("ac", "a", "c"),
    parentChild("bc", "b", "c"),
    parentChild("ad", "a", "d"),
    parentChild("bd", "b", "d"),
    parentChild("ae", "a", "e"),
    parentChild("be", "b", "e"),
  ],
};

/** CASE 2: A + B -> C -> D -> E, F, G (deep single-child chain, then a wide sibling row). */
export const case2DeepChain: FamilyGraph = {
  persons: [
    person("a", "male"),
    person("b", "female"),
    person("c", "unknown"),
    person("d", "unknown"),
    person("e", "unknown"),
    person("f", "unknown"),
    person("g", "unknown"),
  ],
  relationships: [
    spouse("ab", "a", "b"),
    parentChild("ac", "a", "c"),
    parentChild("bc", "b", "c"),
    parentChild("cd", "c", "d"),
    parentChild("de", "d", "e"),
    parentChild("df", "d", "f"),
    parentChild("dg", "d", "g"),
  ],
};

/** CASE 3: A+B -> C; A+D -> E (remarriage — A appears exactly once, two partnerships). */
export const case3Remarriage: FamilyGraph = {
  persons: [
    person("a", "male"),
    person("b", "female"),
    person("c", "unknown"),
    person("d", "female"),
    person("e", "unknown"),
  ],
  relationships: [
    spouse("ab", "a", "b", "divorced"),
    parentChild("ac", "a", "c"),
    parentChild("bc", "b", "c"),
    spouse("ad", "a", "d", "married"),
    parentChild("ae", "a", "e"),
    parentChild("de", "d", "e"),
  ],
};

/** CASE 4: A+B -> C; A+D -> E; B+F -> G (both former spouses remarry). */
export const case4BothRemarry: FamilyGraph = {
  persons: [
    person("a", "male"),
    person("b", "female"),
    person("c", "unknown"),
    person("d", "female"),
    person("e", "unknown"),
    person("f", "male"),
    person("g", "unknown"),
  ],
  relationships: [
    spouse("ab", "a", "b", "divorced"),
    parentChild("ac", "a", "c"),
    parentChild("bc", "b", "c"),
    spouse("ad", "a", "d", "married"),
    parentChild("ae", "a", "e"),
    parentChild("de", "d", "e"),
    spouse("bf", "f", "b", "married"),
    parentChild("fg", "f", "g"),
    parentChild("bg", "b", "g"),
  ],
};

/** CASE 5: parent partnership -> A, B, C; A -> D, E, F (one sibling's subtree is itself a branch). */
export const case5SiblingSubtree: FamilyGraph = {
  persons: [
    person("p1", "male"),
    person("p2", "female"),
    person("a", "male"),
    person("b", "unknown"),
    person("c", "unknown"),
    person("d", "unknown"),
    person("e", "unknown"),
    person("f", "unknown"),
  ],
  relationships: [
    spouse("p1p2", "p1", "p2"),
    parentChild("p1a", "p1", "a"),
    parentChild("p2a", "p2", "a"),
    parentChild("p1b", "p1", "b"),
    parentChild("p2b", "p2", "b"),
    parentChild("p1c", "p1", "c"),
    parentChild("p2c", "p2", "c"),
    parentChild("ad", "a", "d"),
    parentChild("ae", "a", "e"),
    parentChild("af", "a", "f"),
  ],
};

/**
 * CASE 6: large descendant subtree on one sibling — sibling "big" has 4
 * children, each with 2 children of their own; siblings "small1"/"small2"
 * are childless. Verifies unrelated siblings are pushed clear of a large
 * branch without collapsing to equal width.
 */
export const case6AsymmetricBranch: FamilyGraph = {
  persons: [
    person("p1", "male"),
    person("p2", "female"),
    person("small1", "unknown"),
    person("big", "unknown"),
    person("small2", "unknown"),
    ...["b1", "b2", "b3", "b4"].map((id) => person(id, "unknown")),
    ...["b1x", "b1y", "b2x", "b2y", "b3x", "b3y", "b4x", "b4y"].map((id) =>
      person(id, "unknown"),
    ),
  ],
  relationships: [
    spouse("p1p2", "p1", "p2"),
    parentChild("p1s1", "p1", "small1"),
    parentChild("p2s1", "p2", "small1"),
    parentChild("p1big", "p1", "big"),
    parentChild("p2big", "p2", "big"),
    parentChild("p1s2", "p1", "small2"),
    parentChild("p2s2", "p2", "small2"),
    ...["b1", "b2", "b3", "b4"].map((id) =>
      parentChild(`big-${id}`, "big", id),
    ),
    parentChild("b1-b1x", "b1", "b1x"),
    parentChild("b1-b1y", "b1", "b1y"),
    parentChild("b2-b2x", "b2", "b2x"),
    parentChild("b2-b2y", "b2", "b2y"),
    parentChild("b3-b3x", "b3", "b3x"),
    parentChild("b3-b3y", "b3", "b3y"),
    parentChild("b4-b4x", "b4", "b4x"),
    parentChild("b4-b4y", "b4", "b4y"),
  ],
};

/**
 * CASE 7: large paternal branch + large maternal branch — focus person's
 * father's side has many siblings/cousins, mother's side has many too, on
 * the SAME ancestor generation row.
 */
export const case7LargeBothSides: FamilyGraph = {
  persons: [
    person("focus", "male"),
    person("father", "male"),
    person("mother", "female"),
    person("fgf", "male"), // father's father
    person("fgm", "female"), // father's mother
    person("mgf", "male"), // mother's father
    person("mgm", "female"), // mother's mother
    ...["fu1", "fu2", "fu3"].map((id) => person(id, "unknown")), // father's siblings
    ...["mu1", "mu2", "mu3"].map((id) => person(id, "unknown")), // mother's siblings
  ],
  relationships: [
    spouse("fm", "father", "mother"),
    parentChild("f-focus", "father", "focus"),
    parentChild("m-focus", "mother", "focus"),
    spouse("fgfgm", "fgf", "fgm"),
    parentChild("fgf-father", "fgf", "father"),
    parentChild("fgm-father", "fgm", "father"),
    ...["fu1", "fu2", "fu3"].map((id) => parentChild(`fgf-${id}`, "fgf", id)),
    ...["fu1", "fu2", "fu3"].map((id) => parentChild(`fgm-${id}`, "fgm", id)),
    spouse("mgfmgm", "mgf", "mgm"),
    parentChild("mgf-mother", "mgf", "mother"),
    parentChild("mgm-mother", "mgm", "mother"),
    ...["mu1", "mu2", "mu3"].map((id) => parentChild(`mgf-${id}`, "mgf", id)),
    ...["mu1", "mu2", "mu3"].map((id) => parentChild(`mgm-${id}`, "mgm", id)),
  ],
};

/** CASE 8: divorce + remarriage + children from multiple partnerships, three generations deep. */
export const case8DivorceRemarriageDeep: FamilyGraph = {
  persons: [
    person("gf", "male"),
    person("gm", "female"),
    person("a", "male"),
    person("b", "female"),
    person("d", "female"),
    person("c", "unknown"), // child of a+b
    person("e", "unknown"), // child of a+d
    person("gc", "unknown"), // grandchild, child of c
  ],
  relationships: [
    spouse("gfgm", "gf", "gm"),
    parentChild("gf-a", "gf", "a"),
    parentChild("gm-a", "gm", "a"),
    spouse("ab", "a", "b", "divorced"),
    parentChild("ac", "a", "c"),
    parentChild("bc", "b", "c"),
    spouse("ad", "a", "d", "married"),
    parentChild("ae", "a", "e"),
    parentChild("de", "d", "e"),
    parentChild("c-gc", "c", "gc"),
  ],
};

/** CASE 9: many siblings (8) under one partnership. */
export const case9ManySiblings: FamilyGraph = {
  persons: [
    person("p1", "male"),
    person("p2", "female"),
    ...Array.from({ length: 8 }, (_, i) => person(`s${i}`, "unknown")),
  ],
  relationships: [
    spouse("p1p2", "p1", "p2"),
    ...Array.from({ length: 8 }, (_, i) =>
      parentChild(`p1s${i}`, "p1", `s${i}`),
    ),
    ...Array.from({ length: 8 }, (_, i) =>
      parentChild(`p2s${i}`, "p2", `s${i}`),
    ),
  ],
};

/** CASE 10: several generations in both directions (3 up, 3 down) from focus. */
export const case10ManyGenerations: FamilyGraph = {
  persons: [
    person("ggf", "male"),
    person("ggm", "female"),
    person("gf", "male"),
    person("gm", "female"),
    person("father", "male"),
    person("mother", "female"),
    person("focus", "male"),
    person("spouse", "female"),
    person("child", "unknown"),
    person("grandchild", "unknown"),
    person("greatgrandchild", "unknown"),
  ],
  relationships: [
    spouse("ggfggm", "ggf", "ggm"),
    parentChild("ggf-gf", "ggf", "gf"),
    parentChild("ggm-gf", "ggm", "gf"),
    spouse("gfgm", "gf", "gm"),
    parentChild("gf-father", "gf", "father"),
    parentChild("gm-father", "gm", "father"),
    spouse("fathermother", "father", "mother"),
    parentChild("father-focus", "father", "focus"),
    parentChild("mother-focus", "mother", "focus"),
    spouse("focusspouse", "focus", "spouse"),
    parentChild("focus-child", "focus", "child"),
    parentChild("spouse-child", "spouse", "child"),
    parentChild("child-grandchild", "child", "grandchild"),
    parentChild("grandchild-greatgrandchild", "grandchild", "greatgrandchild"),
  ],
};
