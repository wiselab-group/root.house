import type { FamilyGraph } from "./types";

/**
 * tree-v3 — реальные генеалогические данные, перенесённые ДОСЛОВНО из
 * src/domain/tree-v2/fixture.ts (§2 задачи: разрешено переиспользовать
 * только реальные данные — people/relationships, НЕ layout tree-v2).
 * tree-v2 остаётся нетронутым; это независимая копия под типы tree-v3
 * (форма типов идентична, но tree-v3 не импортирует из tree-v2 — §38).
 *
 * Урезано по просьбе пользователя до минимального ядра — остальные люди
 * будут добавляться поэтапно вручную (см. git history полной версии для
 * оригинального 55-персонного набора, если понадобится восстановить).
 */
export const focusPersonId = "alexander-kupchik";
const eleonoraId = "eleonora-kupchik";
const evaId = "eva-kupchik";
const viktorId = "viktor-kupchik";
const galinaId = "galina-kupchik";
const nikolaiKupchikId = "nikolai-kupchik";
const elizavetaId = "elizaveta-kupchik";
const nikolaiKozlovskyId = "nikolai-kozlovsky";
const nadezhdaId = "nadezhda-kozlovskaya";

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
    {
      id: evaId,
      firstName: "Эва",
      lastName: "Купчик",
      gender: "female",
    },
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
  ],
  relationships: [
    {
      id: "alexander-eleonora-spouse",
      kind: "spouse",
      from: focusPersonId,
      to: eleonoraId,
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
      id: "nikolai-kupchik-elizaveta-spouse",
      kind: "spouse",
      from: nikolaiKupchikId,
      to: elizavetaId,
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
      id: "nikolai-kozlovsky-nadezhda-spouse",
      kind: "spouse",
      from: nikolaiKozlovskyId,
      to: nadezhdaId,
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
  ],
};
