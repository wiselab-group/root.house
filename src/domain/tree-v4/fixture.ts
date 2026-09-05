import type { FamilyGraph } from "./types";

/**
 * tree-v4 — real genealogy data, minimal core: Alexander Kupczyk, Eleonora
 * (his wife), Eva (their daughter), Alexander's parents Viktor and Galina,
 * his sister Daria, Viktor's own parents Nikolai and Elizaveta plus Viktor's
 * siblings Nikolai Jr./Svetlana/Natalya, Natalya's own husband Vladimir
 * Evtukh and their children Egor/Anastasiya, Svetlana's own husband Viktor
 * Efimovich and their children Olga/Yuriy Efimovich, Nikolai (Sr.)'s own
 * parents Vladimir and Marfa, Vladimir's own father Yustin (a SOLO parent —
 * no recorded mother/spouse for Yustin in this data, exercising the
 * SoloParent path with real data), Elizaveta's own parents Grigory and
 * Elizaveta Krivusha, and Galina's own parents Nikolai and Nadezhda
 * Kozlovsky (Nikolai Kozlovsky's own parents Vasily and Elizaveta
 * Kozlovskaya, and Vasily's own father Petr — a SOLO parent, id from
 * tree-v2's fixture rather than tree-v3's, since tree-v2 is the one that
 * records this generation) plus Galina's sisters Nina/Marina/Tatyana/Vera/
 * Lyubov/Olga/Raisa/Lyudmila. This is the ONLY real data reused from the
 * existing project data (people/relationships, never layout code —
 * tree-v2/tree-v3 remain untouched and are not imported here); ids match
 * the existing tree-v2/tree-v3 fixtures so this stays the same canonical
 * people, not new synthetic stand-ins. Broader family/ancestor/divorce/
 * remarriage scenarios beyond this core are covered by the synthetic
 * fixtures below, not by further expanding this real dataset.
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
const vladimirEvtukhId = "vladimir-evtukh";
const egorEvtukhId = "egor-evtukh";
const anastasiyaEvtukhId = "anastasiya-evtukh";
const viktorEfimovichId = "viktor-efimovich";
const olgaEfimovichId = "olga-efimovich";
const yuriyEfimovichId = "yuriy-efimovich";
const vladimirId = "vladimir-kupchik";
const marfaId = "marfa-kupchik";
const yustinId = "yustin-kupchik";
const grigoryKrivushaId = "grigory-krivusha";
const elizavetaKrivushaId = "elizaveta-krivusha";
const nikolaiKozlovskyId = "nikolai-kozlovsky";
const vasilyKozlovskyId = "vasily-kozlovsky";
const elizavetaKozlovskayaId = "elizaveta-kozlovskaya";
const petrKozlovskyId = "petr-kozlovsky";
const nadezhdaId = "nadezhda-kozlovskaya";
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
      id: vladimirEvtukhId,
      firstName: "Владимир",
      lastName: "Евтух",
      gender: "male",
    },
    {
      id: egorEvtukhId,
      firstName: "Егор",
      lastName: "Евтух",
      gender: "male",
    },
    {
      id: anastasiyaEvtukhId,
      firstName: "Анастасия",
      lastName: "Евтух",
      gender: "female",
    },
    {
      id: viktorEfimovichId,
      firstName: "Виктор",
      lastName: "Ефимович",
      gender: "male",
    },
    {
      id: olgaEfimovichId,
      firstName: "Ольга",
      lastName: "Ефимович",
      gender: "female",
    },
    {
      id: yuriyEfimovichId,
      firstName: "Юрий",
      lastName: "Ефимович",
      gender: "male",
    },
    {
      id: vladimirId,
      firstName: "Владимир",
      lastName: "Купчик",
      gender: "male",
    },
    {
      id: marfaId,
      firstName: "Марфа",
      lastName: "Купчик",
      gender: "female",
    },
    {
      id: yustinId,
      firstName: "Юстин",
      lastName: "Купчик",
      gender: "male",
    },
    {
      id: grigoryKrivushaId,
      firstName: "Григорий",
      lastName: "Кривуша",
      gender: "male",
    },
    {
      id: elizavetaKrivushaId,
      firstName: "Елизавета",
      lastName: "Кривуша",
      gender: "female",
    },
    {
      id: nikolaiKozlovskyId,
      firstName: "Николай",
      lastName: "Козловский",
      gender: "male",
    },
    {
      id: vasilyKozlovskyId,
      firstName: "Василий",
      lastName: "Козловский",
      gender: "male",
    },
    {
      id: elizavetaKozlovskayaId,
      firstName: "Елизавета",
      lastName: "Козловская",
      gender: "female",
    },
    {
      id: petrKozlovskyId,
      firstName: "Пётр",
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
      id: "natalya-vladimir-evtukh-spouse",
      kind: "spouse",
      from: vladimirEvtukhId,
      to: natalyaId,
      status: "married",
    },
    {
      id: "vladimir-evtukh-egor-parent",
      kind: "parent-child",
      from: vladimirEvtukhId,
      to: egorEvtukhId,
    },
    {
      id: "natalya-egor-parent",
      kind: "parent-child",
      from: natalyaId,
      to: egorEvtukhId,
    },
    {
      id: "vladimir-evtukh-anastasiya-parent",
      kind: "parent-child",
      from: vladimirEvtukhId,
      to: anastasiyaEvtukhId,
    },
    {
      id: "natalya-anastasiya-parent",
      kind: "parent-child",
      from: natalyaId,
      to: anastasiyaEvtukhId,
    },
    {
      id: "svetlana-viktor-efimovich-spouse",
      kind: "spouse",
      from: viktorEfimovichId,
      to: svetlanaId,
      status: "married",
    },
    {
      id: "viktor-efimovich-olga-parent",
      kind: "parent-child",
      from: viktorEfimovichId,
      to: olgaEfimovichId,
    },
    {
      id: "svetlana-olga-parent",
      kind: "parent-child",
      from: svetlanaId,
      to: olgaEfimovichId,
    },
    {
      id: "viktor-efimovich-yuriy-parent",
      kind: "parent-child",
      from: viktorEfimovichId,
      to: yuriyEfimovichId,
    },
    {
      id: "svetlana-yuriy-parent",
      kind: "parent-child",
      from: svetlanaId,
      to: yuriyEfimovichId,
    },
    {
      id: "vladimir-marfa-spouse",
      kind: "spouse",
      from: vladimirId,
      to: marfaId,
      status: "married",
    },
    {
      id: "vladimir-nikolai-kupchik-sr-parent",
      kind: "parent-child",
      from: vladimirId,
      to: nikolaiKupchikId,
    },
    {
      id: "marfa-nikolai-kupchik-sr-parent",
      kind: "parent-child",
      from: marfaId,
      to: nikolaiKupchikId,
    },
    {
      id: "yustin-vladimir-parent",
      kind: "parent-child",
      from: yustinId,
      to: vladimirId,
    },
    {
      id: "grigory-elizaveta-krivusha-spouse",
      kind: "spouse",
      from: grigoryKrivushaId,
      to: elizavetaKrivushaId,
      status: "married",
    },
    {
      id: "grigory-elizaveta-kupchik-parent",
      kind: "parent-child",
      from: grigoryKrivushaId,
      to: elizavetaId,
    },
    {
      id: "elizaveta-krivusha-elizaveta-kupchik-parent",
      kind: "parent-child",
      from: elizavetaKrivushaId,
      to: elizavetaId,
    },
    {
      id: "vasily-elizaveta-kozlovskaya-spouse",
      kind: "spouse",
      from: vasilyKozlovskyId,
      to: elizavetaKozlovskayaId,
      status: "married",
    },
    {
      id: "vasily-nikolai-kozlovsky-parent",
      kind: "parent-child",
      from: vasilyKozlovskyId,
      to: nikolaiKozlovskyId,
    },
    {
      id: "elizaveta-kozlovskaya-nikolai-kozlovsky-parent",
      kind: "parent-child",
      from: elizavetaKozlovskayaId,
      to: nikolaiKozlovskyId,
    },
    {
      id: "petr-kozlovsky-vasily-parent",
      kind: "parent-child",
      from: petrKozlovskyId,
      to: vasilyKozlovskyId,
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
