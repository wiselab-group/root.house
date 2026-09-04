import type { FamilyGraph } from "./types";

/**
 * tree-v4 — real genealogy data, minimal core: Alexander Kupczyk, Eleonora
 * (his wife), Eva (their daughter), Alexander's parents Viktor and Galina,
 * his sister Daria, Viktor's own parents Nikolai and Elizaveta plus Viktor's
 * siblings Nikolai Jr./Svetlana/Natalya, and Galina's own parents Nikolai
 * and Nadezhda Kozlovsky plus Galina's sister Nina. This is the ONLY real
 * data reused from the existing project data (people/relationships, never
 * layout code — tree-v2/tree-v3 remain untouched and are not imported
 * here); ids match the existing tree-v2/tree-v3 fixtures so this stays the
 * same canonical people, not new synthetic stand-ins. Broader family/
 * ancestor/divorce/remarriage scenarios beyond this core are covered by the
 * synthetic fixtures below, not by further expanding this real dataset.
 */
export const focusPersonId = "alexander-kupchik";
const eleonoraId = "eleonora-kupchik";
const evaId = "eva-kupchik";
const viktorId = "viktor-kupchik";
const galinaId = "galina-kupchik";
const dariaId = "daria-kupchik";
const nikolaiKupchikId = "nikolai-kupchik";
const elizavetaId = "elizaveta-kupchik";
const nikolaiKupchikJrId = "nikolai-kupchik-jr";
const svetlanaId = "svetlana-kupchik";
const natalyaId = "natalya-kupchik";
const nikolaiKozlovskyId = "nikolai-kozlovsky";
const nadezhdaId = "nadezhda-kozlovskaya";
const ninaId = "nina-kozlovskaya";

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
    {
      id: viktorId,
      firstName: "Виктор",
      lastName: "Купчик",
      gender: "male",
    },
    {
      id: galinaId,
      firstName: "Галина",
      lastName: "Купчик",
      gender: "female",
    },
    {
      id: dariaId,
      firstName: "Дарья",
      lastName: "Купчик",
      gender: "female",
    },
    {
      id: nikolaiKupchikId,
      firstName: "Николай",
      lastName: "Купчик",
      gender: "male",
    },
    {
      id: elizavetaId,
      firstName: "Елизавета",
      lastName: "Купчик",
      gender: "female",
    },
    {
      id: nikolaiKupchikJrId,
      firstName: "Николай",
      lastName: "Купчик",
      gender: "male",
    },
    {
      id: svetlanaId,
      firstName: "Светлана",
      lastName: "Купчик",
      gender: "female",
    },
    {
      id: natalyaId,
      firstName: "Наталья",
      lastName: "Купчик",
      gender: "female",
    },
    {
      id: nikolaiKozlovskyId,
      firstName: "Николай",
      lastName: "Козловский",
      gender: "male",
    },
    {
      id: nadezhdaId,
      firstName: "Надежда",
      lastName: "Козловская",
      gender: "female",
    },
    {
      id: ninaId,
      firstName: "Нина",
      lastName: "Козловская",
      gender: "female",
    },
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
    {
      id: "viktor-galina-spouse",
      kind: "spouse",
      from: viktorId,
      to: galinaId,
      status: "married",
    },
    {
      id: "viktor-alexander-parent",
      kind: "parent-child",
      from: viktorId,
      to: focusPersonId,
    },
    {
      id: "galina-alexander-parent",
      kind: "parent-child",
      from: galinaId,
      to: focusPersonId,
    },
    {
      id: "viktor-daria-parent",
      kind: "parent-child",
      from: viktorId,
      to: dariaId,
    },
    {
      id: "galina-daria-parent",
      kind: "parent-child",
      from: galinaId,
      to: dariaId,
    },
    {
      id: "nikolai-kupchik-elizaveta-spouse",
      kind: "spouse",
      from: nikolaiKupchikId,
      to: elizavetaId,
      status: "married",
    },
    {
      id: "nikolai-kupchik-viktor-parent",
      kind: "parent-child",
      from: nikolaiKupchikId,
      to: viktorId,
    },
    {
      id: "elizaveta-viktor-parent",
      kind: "parent-child",
      from: elizavetaId,
      to: viktorId,
    },
    {
      id: "nikolai-kupchik-sr-nikolai-jr-parent",
      kind: "parent-child",
      from: nikolaiKupchikId,
      to: nikolaiKupchikJrId,
    },
    {
      id: "elizaveta-nikolai-jr-parent",
      kind: "parent-child",
      from: elizavetaId,
      to: nikolaiKupchikJrId,
    },
    {
      id: "nikolai-kupchik-sr-svetlana-parent",
      kind: "parent-child",
      from: nikolaiKupchikId,
      to: svetlanaId,
    },
    {
      id: "elizaveta-svetlana-parent",
      kind: "parent-child",
      from: elizavetaId,
      to: svetlanaId,
    },
    {
      id: "nikolai-kupchik-sr-natalya-parent",
      kind: "parent-child",
      from: nikolaiKupchikId,
      to: natalyaId,
    },
    {
      id: "elizaveta-natalya-parent",
      kind: "parent-child",
      from: elizavetaId,
      to: natalyaId,
    },
    {
      id: "nikolai-kozlovsky-nadezhda-spouse",
      kind: "spouse",
      from: nikolaiKozlovskyId,
      to: nadezhdaId,
      status: "married",
    },
    {
      id: "nikolai-kozlovsky-galina-parent",
      kind: "parent-child",
      from: nikolaiKozlovskyId,
      to: galinaId,
    },
    {
      id: "nadezhda-galina-parent",
      kind: "parent-child",
      from: nadezhdaId,
      to: galinaId,
    },
    {
      id: "nikolai-kozlovsky-nina-parent",
      kind: "parent-child",
      from: nikolaiKozlovskyId,
      to: ninaId,
    },
    {
      id: "nadezhda-nina-parent",
      kind: "parent-child",
      from: nadezhdaId,
      to: ninaId,
    },
  ],
};
