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
const dariaId = "daria-kupchik";
const nikolaiKupchikJrId = "nikolai-kupchik-jr";
const svetlanaId = "svetlana-kupchik";
const natalyaId = "natalya-kupchik";
const ninaId = "nina-kozlovskaya";
const marinaId = "marina-kozlovskaya";
const tatyanaId = "tatyana-kozlovskaya";
const veraId = "vera-kozlovskaya";
const lyubovId = "lyubov-kozlovskaya";
const olgaId = "olga-kozlovskaya";
const raisaId = "raisa-kozlovskaya";
const lyudmilaId = "lyudmila-kozlovskaya";

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
    {
      id: dariaId,
      firstName: "Дарья",
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
      id: ninaId,
      firstName: "Нина",
      lastName: "Козловская",
      gender: "female",
    },
    {
      id: marinaId,
      firstName: "Марина",
      lastName: "Козловская",
      gender: "female",
    },
    {
      id: tatyanaId,
      firstName: "Татьяна",
      lastName: "Козловская",
      gender: "female",
    },
    {
      id: veraId,
      firstName: "Вера",
      lastName: "Козловская",
      gender: "female",
    },
    {
      id: lyubovId,
      firstName: "Любовь",
      lastName: "Козловская",
      gender: "female",
    },
    {
      id: olgaId,
      firstName: "Ольга",
      lastName: "Козловская",
      gender: "female",
    },
    {
      id: raisaId,
      firstName: "Раиса",
      lastName: "Козловская",
      gender: "female",
    },
    {
      id: lyudmilaId,
      firstName: "Людмила",
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
    {
      id: "nikolai-kozlovsky-marina-parent",
      kind: "parent-child",
      from: nikolaiKozlovskyId,
      to: marinaId,
    },
    {
      id: "nadezhda-marina-parent",
      kind: "parent-child",
      from: nadezhdaId,
      to: marinaId,
    },
    {
      id: "nikolai-kozlovsky-tatyana-parent",
      kind: "parent-child",
      from: nikolaiKozlovskyId,
      to: tatyanaId,
    },
    {
      id: "nadezhda-tatyana-parent",
      kind: "parent-child",
      from: nadezhdaId,
      to: tatyanaId,
    },
    {
      id: "nikolai-kozlovsky-vera-parent",
      kind: "parent-child",
      from: nikolaiKozlovskyId,
      to: veraId,
    },
    {
      id: "nadezhda-vera-parent",
      kind: "parent-child",
      from: nadezhdaId,
      to: veraId,
    },
    {
      id: "nikolai-kozlovsky-lyubov-parent",
      kind: "parent-child",
      from: nikolaiKozlovskyId,
      to: lyubovId,
    },
    {
      id: "nadezhda-lyubov-parent",
      kind: "parent-child",
      from: nadezhdaId,
      to: lyubovId,
    },
    {
      id: "nikolai-kozlovsky-olga-parent",
      kind: "parent-child",
      from: nikolaiKozlovskyId,
      to: olgaId,
    },
    {
      id: "nadezhda-olga-parent",
      kind: "parent-child",
      from: nadezhdaId,
      to: olgaId,
    },
    {
      id: "nikolai-kozlovsky-raisa-parent",
      kind: "parent-child",
      from: nikolaiKozlovskyId,
      to: raisaId,
    },
    {
      id: "nadezhda-raisa-parent",
      kind: "parent-child",
      from: nadezhdaId,
      to: raisaId,
    },
    {
      id: "nikolai-kozlovsky-lyudmila-parent",
      kind: "parent-child",
      from: nikolaiKozlovskyId,
      to: lyudmilaId,
    },
    {
      id: "nadezhda-lyudmila-parent",
      kind: "parent-child",
      from: nadezhdaId,
      to: lyudmilaId,
    },
  ],
};
