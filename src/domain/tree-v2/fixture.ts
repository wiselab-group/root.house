import type { FamilyGraph } from "./types";

/**
 * Отправная точка нового дерева: единственная фокус-персона.
 * Пополняется по ходу диалога с пользователем — родители, супруги, дети и т.д.
 * Без БД: чистый in-memory fixture для итерации над layout'ом.
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
const daryaId = "darya-kupchik";
const nikolaiKupchikJrId = "nikolai-kupchik-jr";
const nataliaId = "natalia-evtukh";
const svetlanaId = "svetlana-efimovich";
const ninaId = "nina-tikhonovich";
const marinaId = "marina-ravbetskaya";
const tatianaId = "tatiana-naumovich";
const veraId = "vera-artyukh";
const lyubovId = "lyubov-baidovskaya";
const olgaId = "olga-stashevskaya";
const raisaId = "raisa-shlyazhko";
const lyudmilaId = "lyudmila-redko";
const viktorRavbetskyId = "viktor-ravbetsky";
const lyudmilaRavbetskayaId = "lyudmila-ravbetskaya";
const vadimId = "vadim-ravbetsky";
const vladimirKupchikId = "vladimir-kupchik";
const marfaId = "marfa-kupchik";
const mikhailKupchikId = "mikhail-kupchik";
const veraKupchikId = "vera-kupchik";
const marinaKupchikId = "marina-kupchik";
const yustinKupchikId = "yustin-kupchik";
const grigoryKrivushaId = "grigory-krivusha";
const elizavetaKrivushaId = "elizaveta-krivusha";
const elenaUshkarId = "elena-ushkar";
const nikolaiUshkarId = "nikolai-ushkar";
const viktorEfimovichId = "viktor-efimovich";
const vladimirEvtukhId = "vladimir-evtukh";
const egorEvtukhId = "egor-evtukh";
const anastasiaEvtukhId = "anastasia-evtukh";
const yuzikKozlovskyId = "yuzik-kozlovsky";
const daniilKozlovskyId = "daniil-kozlovsky";
const alexeyKozlovskyId = "alexey-kozlovsky";
const vasilyKozlovskyId = "vasily-kozlovsky";
const elizavetaKozlovskayaId = "elizaveta-kozlovskaya";
const grigoryKolesnikovichId = "grigory-kolesnikovich";
const agrafenaKolesnikovichId = "agrafena-kolesnikovich";
const nikolaiKolesnikovichId = "nikolai-kolesnikovich";
const alexeyKolesnikovichId = "alexey-kolesnikovich";
const pavelKolesnikovichId = "pavel-kolesnikovich";
const grigoryKolesnikovichJrId = "grigory-kolesnikovich-jr";
const iosifKolesnikovichId = "iosif-kolesnikovich";
const filippStrunevskyId = "filipp-strunevsky";
const yakovKozlovskyId = "yakov-kozlovsky";
const petrKozlovskyId = "petr-kozlovsky";

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
      id: daryaId,
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
      id: nataliaId,
      firstName: "Наталья",
      lastName: "Евтух",
      gender: "female",
    },
    {
      id: svetlanaId,
      firstName: "Светлана",
      lastName: "Ефимович",
      gender: "female",
    },
    {
      id: ninaId,
      firstName: "Нина",
      lastName: "Тихонович",
      gender: "female",
    },
    {
      id: marinaId,
      firstName: "Марина",
      lastName: "Равбецкая",
      gender: "female",
    },
    {
      id: tatianaId,
      firstName: "Татьяна",
      lastName: "Наумович",
      gender: "female",
    },
    {
      id: veraId,
      firstName: "Вера",
      lastName: "Артюх",
      gender: "female",
    },
    {
      id: lyubovId,
      firstName: "Любовь",
      lastName: "Байдовская",
      gender: "female",
    },
    {
      id: olgaId,
      firstName: "Ольга",
      lastName: "Сташевская",
      gender: "female",
    },
    {
      id: raisaId,
      firstName: "Раиса",
      lastName: "Шляжко",
      gender: "female",
    },
    {
      id: lyudmilaId,
      firstName: "Людмила",
      lastName: "Редько",
      gender: "female",
    },
    {
      id: viktorRavbetskyId,
      firstName: "Виктор",
      lastName: "Равбецкий",
      gender: "male",
    },
    {
      id: lyudmilaRavbetskayaId,
      firstName: "Людмила",
      lastName: "Равбецкая",
      gender: "female",
    },
    {
      id: vadimId,
      firstName: "Вадим",
      lastName: "Равбецкий",
      gender: "male",
    },
    {
      id: vladimirKupchikId,
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
      id: mikhailKupchikId,
      firstName: "Михаил",
      lastName: "Купчик",
      gender: "male",
    },
    {
      id: veraKupchikId,
      firstName: "Вера",
      lastName: "Купчик",
      gender: "female",
    },
    {
      id: marinaKupchikId,
      firstName: "Марина",
      lastName: "Купчик",
      gender: "female",
    },
    {
      id: yustinKupchikId,
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
      id: elenaUshkarId,
      firstName: "Елена",
      lastName: "Ушкар",
      gender: "female",
    },
    {
      id: nikolaiUshkarId,
      firstName: "Николай",
      lastName: "Ушкар",
      gender: "male",
    },
    {
      id: viktorEfimovichId,
      firstName: "Виктор",
      lastName: "Ефимович",
      gender: "male",
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
      id: anastasiaEvtukhId,
      firstName: "Анастасия",
      lastName: "Евтух",
      gender: "female",
    },
    {
      id: yuzikKozlovskyId,
      firstName: "Юзик",
      lastName: "Козловский",
      gender: "male",
    },
    {
      id: daniilKozlovskyId,
      firstName: "Даниил",
      lastName: "Козловский",
      gender: "male",
    },
    {
      id: alexeyKozlovskyId,
      firstName: "Алексей",
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
      id: grigoryKolesnikovichId,
      firstName: "Григорий",
      lastName: "Колесникович",
      gender: "male",
    },
    {
      id: agrafenaKolesnikovichId,
      firstName: "Аграфена",
      lastName: "Колесникович",
      gender: "female",
    },
    {
      id: nikolaiKolesnikovichId,
      firstName: "Николай",
      lastName: "Колесникович",
      gender: "male",
    },
    {
      id: alexeyKolesnikovichId,
      firstName: "Алексей",
      lastName: "Колесникович",
      gender: "male",
    },
    {
      id: pavelKolesnikovichId,
      firstName: "Павел",
      lastName: "Колесникович",
      gender: "male",
    },
    {
      id: grigoryKolesnikovichJrId,
      firstName: "Григорий",
      lastName: "Колесникович",
      gender: "male",
    },
    {
      id: iosifKolesnikovichId,
      firstName: "Иосиф",
      lastName: "Колесникович",
      gender: "male",
    },
    {
      id: filippStrunevskyId,
      firstName: "Филипп",
      lastName: "Струневский",
      gender: "male",
    },
    {
      id: yakovKozlovskyId,
      firstName: "Яков",
      lastName: "Козловский",
      gender: "male",
    },
    {
      id: petrKozlovskyId,
      firstName: "Пётр",
      lastName: "Козловский",
      gender: "male",
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
      id: "viktor-darya-parent",
      kind: "parent-child",
      from: viktorId,
      to: daryaId,
    },
    {
      id: "galina-darya-parent",
      kind: "parent-child",
      from: galinaId,
      to: daryaId,
    },
    {
      id: "nikolai-kupchik-nikolai-jr-parent",
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
      id: "nikolai-kupchik-natalia-parent",
      kind: "parent-child",
      from: nikolaiKupchikId,
      to: nataliaId,
    },
    {
      id: "elizaveta-natalia-parent",
      kind: "parent-child",
      from: elizavetaId,
      to: nataliaId,
    },
    {
      id: "nikolai-kupchik-svetlana-parent",
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
    ...[
      ninaId,
      marinaId,
      tatianaId,
      veraId,
      lyubovId,
      olgaId,
      raisaId,
      lyudmilaId,
    ].flatMap((sisterId) => [
      {
        id: `nikolai-kozlovsky-${sisterId}-parent`,
        kind: "parent-child" as const,
        from: nikolaiKozlovskyId,
        to: sisterId,
      },
      {
        id: `nadezhda-${sisterId}-parent`,
        kind: "parent-child" as const,
        from: nadezhdaId,
        to: sisterId,
      },
    ]),
    {
      id: "marina-viktor-ravbetsky-spouse",
      kind: "spouse",
      from: marinaId,
      to: viktorRavbetskyId,
    },
    {
      id: "viktor-ravbetsky-lyudmila-parent",
      kind: "parent-child",
      from: viktorRavbetskyId,
      to: lyudmilaRavbetskayaId,
    },
    {
      id: "marina-lyudmila-parent",
      kind: "parent-child",
      from: marinaId,
      to: lyudmilaRavbetskayaId,
    },
    {
      id: "viktor-ravbetsky-vadim-parent",
      kind: "parent-child",
      from: viktorRavbetskyId,
      to: vadimId,
    },
    {
      id: "marina-vadim-parent",
      kind: "parent-child",
      from: marinaId,
      to: vadimId,
    },
    {
      id: "vladimir-kupchik-nikolai-kupchik-parent",
      kind: "parent-child",
      from: vladimirKupchikId,
      to: nikolaiKupchikId,
    },
    {
      id: "marfa-nikolai-kupchik-parent",
      kind: "parent-child",
      from: marfaId,
      to: nikolaiKupchikId,
    },
    {
      id: "vladimir-marfa-spouse",
      kind: "spouse",
      from: vladimirKupchikId,
      to: marfaId,
    },
    {
      id: "vladimir-mikhail-parent",
      kind: "parent-child",
      from: vladimirKupchikId,
      to: mikhailKupchikId,
    },
    {
      id: "marfa-mikhail-parent",
      kind: "parent-child",
      from: marfaId,
      to: mikhailKupchikId,
    },
    {
      id: "vladimir-vera-kupchik-parent",
      kind: "parent-child",
      from: vladimirKupchikId,
      to: veraKupchikId,
    },
    {
      id: "marfa-vera-kupchik-parent",
      kind: "parent-child",
      from: marfaId,
      to: veraKupchikId,
    },
    {
      id: "mikhail-marina-kupchik-spouse",
      kind: "spouse",
      from: mikhailKupchikId,
      to: marinaKupchikId,
    },
    {
      id: "yustin-vladimir-parent",
      kind: "parent-child",
      from: yustinKupchikId,
      to: vladimirKupchikId,
    },
    {
      id: "grigory-krivusha-elizaveta-krivusha-spouse",
      kind: "spouse",
      from: grigoryKrivushaId,
      to: elizavetaKrivushaId,
    },
    {
      id: "grigory-krivusha-elizaveta-kupchik-parent",
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
      id: "grigory-krivusha-elena-ushkar-parent",
      kind: "parent-child",
      from: grigoryKrivushaId,
      to: elenaUshkarId,
    },
    {
      id: "elizaveta-krivusha-elena-ushkar-parent",
      kind: "parent-child",
      from: elizavetaKrivushaId,
      to: elenaUshkarId,
    },
    {
      id: "elena-ushkar-nikolai-ushkar-spouse",
      kind: "spouse",
      from: nikolaiUshkarId,
      to: elenaUshkarId,
    },
    {
      id: "svetlana-viktor-efimovich-spouse",
      kind: "spouse",
      from: viktorEfimovichId,
      to: svetlanaId,
    },
    {
      id: "natalia-vladimir-evtukh-spouse",
      kind: "spouse",
      from: vladimirEvtukhId,
      to: nataliaId,
    },
    {
      id: "vladimir-evtukh-egor-parent",
      kind: "parent-child",
      from: vladimirEvtukhId,
      to: egorEvtukhId,
    },
    {
      id: "natalia-egor-parent",
      kind: "parent-child",
      from: nataliaId,
      to: egorEvtukhId,
    },
    {
      id: "vladimir-evtukh-anastasia-parent",
      kind: "parent-child",
      from: vladimirEvtukhId,
      to: anastasiaEvtukhId,
    },
    {
      id: "natalia-anastasia-parent",
      kind: "parent-child",
      from: nataliaId,
      to: anastasiaEvtukhId,
    },
    {
      id: "vasily-elizaveta-kozlovsky-spouse",
      kind: "spouse",
      from: vasilyKozlovskyId,
      to: elizavetaKozlovskayaId,
    },
    ...[
      nikolaiKozlovskyId,
      yuzikKozlovskyId,
      daniilKozlovskyId,
      alexeyKozlovskyId,
    ].flatMap((childId) => [
      {
        id: `vasily-${childId}-parent`,
        kind: "parent-child" as const,
        from: vasilyKozlovskyId,
        to: childId,
      },
      {
        id: `elizaveta-kozlovskaya-${childId}-parent`,
        kind: "parent-child" as const,
        from: elizavetaKozlovskayaId,
        to: childId,
      },
    ]),
    {
      id: "grigory-agrafena-kolesnikovich-spouse",
      kind: "spouse",
      from: grigoryKolesnikovichId,
      to: agrafenaKolesnikovichId,
    },
    {
      id: "grigory-kolesnikovich-nadezhda-parent",
      kind: "parent-child",
      from: grigoryKolesnikovichId,
      to: nadezhdaId,
    },
    {
      id: "agrafena-kolesnikovich-nadezhda-parent",
      kind: "parent-child",
      from: agrafenaKolesnikovichId,
      to: nadezhdaId,
    },
    ...[
      nikolaiKolesnikovichId,
      alexeyKolesnikovichId,
      pavelKolesnikovichId,
      grigoryKolesnikovichJrId,
    ].flatMap((childId) => [
      {
        id: `grigory-kolesnikovich-${childId}-parent`,
        kind: "parent-child" as const,
        from: grigoryKolesnikovichId,
        to: childId,
      },
      {
        id: `agrafena-kolesnikovich-${childId}-parent`,
        kind: "parent-child" as const,
        from: agrafenaKolesnikovichId,
        to: childId,
      },
    ]),
    {
      id: "iosif-kolesnikovich-grigory-parent",
      kind: "parent-child",
      from: iosifKolesnikovichId,
      to: grigoryKolesnikovichId,
    },
    {
      id: "filipp-strunevsky-agrafena-parent",
      kind: "parent-child",
      from: filippStrunevskyId,
      to: agrafenaKolesnikovichId,
    },
    {
      id: "yakov-kozlovsky-elizaveta-kozlovskaya-parent",
      kind: "parent-child",
      from: yakovKozlovskyId,
      to: elizavetaKozlovskayaId,
    },
    {
      id: "petr-kozlovsky-vasily-parent",
      kind: "parent-child",
      from: petrKozlovskyId,
      to: vasilyKozlovskyId,
    },
  ],
};
