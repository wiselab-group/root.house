import type { FamilyGraph } from "./types";

/**
 * tree-v4 — real genealogy data, minimal core only: Alexander Kupczyk,
 * Eleonora (his wife), Eva (their daughter). This is the ONLY real data
 * reused from the existing project data (people/relationships, never
 * layout code — tree-v2/tree-v3 remain untouched and are not imported here).
 * Broader family/ancestor/divorce/remarriage scenarios are covered by the
 * synthetic fixtures below, not by expanding this real dataset.
 */
export const focusPersonId = "alexander-kupchik";
const eleonoraId = "eleonora-kupchik";
const evaId = "eva-kupchik";

export const initialFamilyGraph: FamilyGraph = {
  persons: [
    {
      id: focusPersonId,
      firstName: "Александр",
      lastName: "Купчик",
      gender: "male",
    },
    {
      id: eleonoraId,
      firstName: "Элеонора",
      lastName: "Купчик",
      gender: "female",
    },
    { id: evaId, firstName: "Эва", lastName: "Купчик", gender: "female" },
  ],
  relationships: [
    {
      id: "alexander-eleonora-spouse",
      kind: "spouse",
      from: focusPersonId,
      to: eleonoraId,
      status: "married",
    },
    {
      id: "alexander-eva-parent",
      kind: "parent-child",
      from: focusPersonId,
      to: evaId,
    },
    {
      id: "eleonora-eva-parent",
      kind: "parent-child",
      from: eleonoraId,
      to: evaId,
    },
  ],
};
