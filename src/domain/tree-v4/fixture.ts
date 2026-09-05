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
 * Elizaveta Krivusha, plus Elizaveta's own sister Elena Ushkar (canonical
 * from tree-v2, another daughter of Grigory and Elizaveta Krivusha) and
 * Elena's own husband Nikolai Ushkar (also canonical), and Galina's own
 * parents Nikolai and Nadezhda
 * Kozlovsky (Nikolai Kozlovsky's own parents Vasily and Elizaveta
 * Kozlovskaya, Vasily's own father Petr, Elizaveta Kozlovskaya's own
 * father Yakov — both SOLO parents, ids from tree-v2's fixture rather than
 * tree-v3's, since tree-v2 is the one that records this generation — and
 * Nikolai Kozlovsky's own brothers Yuzik/Daniil/Alexey, also from tree-v2,
 * and Nadezhda Kozlovskaya's own parents Grigory Kolesnikovich and Agrafena
 * — the id `agrafena-kolesnikovich` is reused from tree-v2, but she's given
 * her maiden name "Струневская"/"Strunevskaya" here rather than her
 * married name "Колесникович", per the user's explicit correction —
 * plus Agrafena's own father Filipp Strunevsky, a SOLO parent, confirming
 * the same maiden surname, and Nadezhda Kozlovskaya's own siblings Nikolai/
 * Alexey/Pavel/Grigory Jr. Kolesnikovich) plus Galina's sisters — each given
 * her own married surname per tree-v2's canonical ids/lastNames (NOT the
 * maiden "Kozlovskaya" invented in an earlier draft of this fixture and
 * later corrected): Nina Tikhonovich, Marina Ravbetskaya, Tatiana Naumovich,
 * Vera Artyukh, Lyubov Baidovskaya, Olga Stashevskaya, Raisa Shlyazhko,
 * Lyudmila Redko — plus Marina's own husband Viktor Ravbetsky (canonical,
 * from tree-v2) and their children Lyudmila Ravbetskaya and Vadim
 * Ravbetsky, and the other five sisters' own husbands: Alexey Naumovich
 * (Tatiana), Vladimir Artyukh (Vera), Vladimir Baidovsky (Lyubov),
 * Alexander Stashevsky (Olga), Sergey Shlyazhko (Raisa), Oleg Redko
 * (Lyudmila) — EXCEPTION to the "canonical ids only" rule below: neither
 * tree-v2 nor tree-v3 records a husband for these five, so these six
 * husbands (minus Viktor Ravbetsky, who is canonical) are genuinely NEW
 * synthetic people, added here only because the user explicitly asked for
 * this exception rather than leaving the sisters' husbands unrecorded.
 * This is otherwise the ONLY real data reused from the existing project
 * data (people/relationships, never layout code — tree-v2/tree-v3 remain
 * untouched and are not imported here); ids match the existing
 * tree-v2/tree-v3 fixtures so this stays the same canonical people, not new
 * synthetic stand-ins (aside from the five husbands above). Broader
 * family/ancestor/divorce/remarriage scenarios beyond this core are
 * covered by the synthetic fixtures below, not by further expanding this
 * real dataset.
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
const elenaUshkarId = "elena-ushkar";
const nikolaiUshkarId = "nikolai-ushkar";
const nikolaiKozlovskyId = "nikolai-kozlovsky";
const yuzikKozlovskyId = "yuzik-kozlovsky";
const daniilKozlovskyId = "daniil-kozlovsky";
const alexeyKozlovskyId = "alexey-kozlovsky";
const vasilyKozlovskyId = "vasily-kozlovsky";
const elizavetaKozlovskayaId = "elizaveta-kozlovskaya";
const petrKozlovskyId = "petr-kozlovsky";
const yakovKozlovskyId = "yakov-kozlovsky";
const nadezhdaId = "nadezhda-kozlovskaya";
const grigoryKolesnikovichId = "grigory-kolesnikovich";
const agrafenaId = "agrafena-kolesnikovich";
const filippStrunevskyId = "filipp-strunevsky";
const nikolaiKolesnikovichId = "nikolai-kolesnikovich";
const alexeyKolesnikovichId = "alexey-kolesnikovich";
const pavelKolesnikovichId = "pavel-kolesnikovich";
const grigoryKolesnikovichJrId = "grigory-kolesnikovich-jr";
const ninaId = "nina-tikhonovich";
const marinaId = "marina-ravbetskaya";
const tatyanaId = "tatiana-naumovich";
const veraId = "vera-artyukh";
const lyubovId = "lyubov-baidovskaya";
const olgaId = "olga-stashevskaya";
const raisaId = "raisa-shlyazhko";
const lyudmilaId = "lyudmila-redko";
const viktorRavbetskyId = "viktor-ravbetsky";
const lyudmilaRavbetskayaId = "lyudmila-ravbetskaya";
const vadimRavbetskyId = "vadim-ravbetsky";
const alexeyNaumovichId = "alexey-naumovich";
const vladimirArtyukhId = "vladimir-artyukh";
const vladimirBaidovskyId = "vladimir-baidovsky";
const alexanderStashevskyId = "alexander-stashevsky";
const sergeyShlyazhkoId = "sergey-shlyazhko";
const olegRedkoId = "oleg-redko";

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
      id: nikolaiKozlovskyId,
      firstName: "Николай",
      lastName: "Козловский",
      gender: "male",
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
      id: petrKozlovskyId,
      firstName: "Пётр",
      lastName: "Козловский",
      gender: "male",
    },
    {
      id: yakovKozlovskyId,
      firstName: "Яков",
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
      id: grigoryKolesnikovichId,
      firstName: "Григорий",
      lastName: "Колесникович",
      gender: "male",
    },
    {
      id: agrafenaId,
      firstName: "Аграфена",
      lastName: "Струневская",
      gender: "female",
    },
    {
      id: filippStrunevskyId,
      firstName: "Филипп",
      lastName: "Струневский",
      gender: "male",
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
      id: tatyanaId,
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
      id: vadimRavbetskyId,
      firstName: "Вадим",
      lastName: "Равбецкий",
      gender: "male",
    },
    {
      id: alexeyNaumovichId,
      firstName: "Алексей",
      lastName: "Наумович",
      gender: "male",
    },
    {
      id: vladimirArtyukhId,
      firstName: "Владимир",
      lastName: "Артюх",
      gender: "male",
    },
    {
      id: vladimirBaidovskyId,
      firstName: "Владимир",
      lastName: "Байдовский",
      gender: "male",
    },
    {
      id: alexanderStashevskyId,
      firstName: "Александр",
      lastName: "Сташевский",
      gender: "male",
    },
    {
      id: sergeyShlyazhkoId,
      firstName: "Сергей",
      lastName: "Шляжко",
      gender: "male",
    },
    {
      id: olegRedkoId,
      firstName: "Олег",
      lastName: "Редько",
      gender: "male",
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
      id: "nikolai-ushkar-elena-ushkar-spouse",
      kind: "spouse",
      from: nikolaiUshkarId,
      to: elenaUshkarId,
      status: "married",
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
      id: "vasily-yuzik-parent",
      kind: "parent-child",
      from: vasilyKozlovskyId,
      to: yuzikKozlovskyId,
    },
    {
      id: "elizaveta-kozlovskaya-yuzik-parent",
      kind: "parent-child",
      from: elizavetaKozlovskayaId,
      to: yuzikKozlovskyId,
    },
    {
      id: "vasily-daniil-parent",
      kind: "parent-child",
      from: vasilyKozlovskyId,
      to: daniilKozlovskyId,
    },
    {
      id: "elizaveta-kozlovskaya-daniil-parent",
      kind: "parent-child",
      from: elizavetaKozlovskayaId,
      to: daniilKozlovskyId,
    },
    {
      id: "vasily-alexey-parent",
      kind: "parent-child",
      from: vasilyKozlovskyId,
      to: alexeyKozlovskyId,
    },
    {
      id: "elizaveta-kozlovskaya-alexey-parent",
      kind: "parent-child",
      from: elizavetaKozlovskayaId,
      to: alexeyKozlovskyId,
    },
    {
      id: "petr-kozlovsky-vasily-parent",
      kind: "parent-child",
      from: petrKozlovskyId,
      to: vasilyKozlovskyId,
    },
    {
      id: "yakov-kozlovsky-elizaveta-kozlovskaya-parent",
      kind: "parent-child",
      from: yakovKozlovskyId,
      to: elizavetaKozlovskayaId,
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
      id: "grigory-agrafena-kolesnikovich-spouse",
      kind: "spouse",
      from: grigoryKolesnikovichId,
      to: agrafenaId,
      status: "married",
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
      from: agrafenaId,
      to: nadezhdaId,
    },
    {
      id: "filipp-strunevsky-agrafena-parent",
      kind: "parent-child",
      from: filippStrunevskyId,
      to: agrafenaId,
    },
    {
      id: "grigory-kolesnikovich-nikolai-parent",
      kind: "parent-child",
      from: grigoryKolesnikovichId,
      to: nikolaiKolesnikovichId,
    },
    {
      id: "agrafena-kolesnikovich-nikolai-parent",
      kind: "parent-child",
      from: agrafenaId,
      to: nikolaiKolesnikovichId,
    },
    {
      id: "grigory-kolesnikovich-alexey-parent",
      kind: "parent-child",
      from: grigoryKolesnikovichId,
      to: alexeyKolesnikovichId,
    },
    {
      id: "agrafena-kolesnikovich-alexey-parent",
      kind: "parent-child",
      from: agrafenaId,
      to: alexeyKolesnikovichId,
    },
    {
      id: "grigory-kolesnikovich-pavel-parent",
      kind: "parent-child",
      from: grigoryKolesnikovichId,
      to: pavelKolesnikovichId,
    },
    {
      id: "agrafena-kolesnikovich-pavel-parent",
      kind: "parent-child",
      from: agrafenaId,
      to: pavelKolesnikovichId,
    },
    {
      id: "grigory-kolesnikovich-grigory-jr-parent",
      kind: "parent-child",
      from: grigoryKolesnikovichId,
      to: grigoryKolesnikovichJrId,
    },
    {
      id: "agrafena-kolesnikovich-grigory-jr-parent",
      kind: "parent-child",
      from: agrafenaId,
      to: grigoryKolesnikovichJrId,
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
    {
      id: "marina-viktor-ravbetsky-spouse",
      kind: "spouse",
      from: marinaId,
      to: viktorRavbetskyId,
      status: "married",
    },
    {
      id: "viktor-ravbetsky-lyudmila-parent",
      kind: "parent-child",
      from: viktorRavbetskyId,
      to: lyudmilaRavbetskayaId,
    },
    {
      id: "marina-lyudmila-ravbetskaya-parent",
      kind: "parent-child",
      from: marinaId,
      to: lyudmilaRavbetskayaId,
    },
    {
      id: "viktor-ravbetsky-vadim-parent",
      kind: "parent-child",
      from: viktorRavbetskyId,
      to: vadimRavbetskyId,
    },
    {
      id: "marina-vadim-parent",
      kind: "parent-child",
      from: marinaId,
      to: vadimRavbetskyId,
    },
    {
      id: "tatiana-alexey-naumovich-spouse",
      kind: "spouse",
      from: alexeyNaumovichId,
      to: tatyanaId,
      status: "married",
    },
    {
      id: "vera-vladimir-artyukh-spouse",
      kind: "spouse",
      from: vladimirArtyukhId,
      to: veraId,
      status: "married",
    },
    {
      id: "lyubov-vladimir-baidovsky-spouse",
      kind: "spouse",
      from: vladimirBaidovskyId,
      to: lyubovId,
      status: "married",
    },
    {
      id: "olga-alexander-stashevsky-spouse",
      kind: "spouse",
      from: alexanderStashevskyId,
      to: olgaId,
      status: "married",
    },
    {
      id: "raisa-sergey-shlyazhko-spouse",
      kind: "spouse",
      from: sergeyShlyazhkoId,
      to: raisaId,
      status: "married",
    },
    {
      id: "lyudmila-oleg-redko-spouse",
      kind: "spouse",
      from: olegRedkoId,
      to: lyudmilaId,
      status: "married",
    },
  ],
};
