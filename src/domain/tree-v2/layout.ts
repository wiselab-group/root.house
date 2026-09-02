import type {
  FamilyGraph,
  LaidOutPerson,
  PersonNodeData,
  TreeLayoutResult,
} from "./types";

/**
 * Горизонтальный шаг (центр-к-центру) между соседними, но НЕ связанными
 * между собой карточками одного поколения (сиблинги, разные юниты) —
 * CARD_SIZE (160, см. card-geometry.ts) + 80px видимого зазора край-в-край.
 * Заметно шире, чем SPOUSE_GAP_X, чтобы "муж и жена стоят рядом" визуально
 * считывалось само по себе, без необходимости присматриваться к пунктирной
 * линии.
 */
const SIBLING_GAP_X = 240;
/**
 * Горизонтальный шаг (центр-к-центру) между супругами ВНУТРИ одного юнита —
 * CARD_SIZE (160) + 40px видимого зазора край-в-край. ВСЕГДА этот
 * фиксированный шаг, независимо от того, сколько у них предков (см.
 * layoutAncestorsOfUnit): предковые поддеревья раздвигаются САМИ, дальше от
 * центра пары, а не растягивают расстояние между самими супругами — иначе
 * пара с многочисленными предками выглядела бы так же "растянуто", как и
 * несвязанные соседние карточки, и весь смысл узкого шага терялся бы.
 */
const SPOUSE_GAP_X = 200;
/** Вертикальный шаг между поколениями. */
const GENERATION_GAP_Y = 220;

/**
 * tree-v2 layout — построение "с нуля", общий алгоритм (не частные случаи
 * по количеству персон/связей — тот подход не масштабируется и уже один раз
 * подводил в старом builder'е).
 *
 * Модель: каждая персона принадлежит "юниту" — она сама плюс все её супруги
 * (spouse-связи схлопываются в один юнит, чтобы пара всегда стояла рядом).
 * Юниты раскладываются по поколениям (generation 0 = юнит фокус-персоны):
 * потомки идут вниз (generation + 1 на каждый шаг), предки — вверх
 * (generation - 1, рекурсивно сколько угодно поколений).
 *
 * Внутри юнита муж располагается слева, жена — справа (CLAUDE.md:
 * husband-left/wife-right), ВСЕГДА на фиксированном SPOUSE_GAP_X друг от
 * друга — визуально это и есть "муж и жена стоят рядом", в отличие от
 * SIBLING_GAP_X между несвязанными соседями. Если у мужа или жены есть
 * собственные предки, их поддеревья растут строго над своим членом юнита
 * (см. layoutAncestorsOfUnit), но раздвигаются от anchor'а (своего члена
 * пары) НАРУЖУ при необходимости — сама пара при этом не растягивается,
 * раздвигается только то, что стоит levels выше неё. Именно это и даёт
 * инвариант "предки мужа уходят строго в одну сторону, предки жены — строго
 * в другую": каждый предок всегда строго над своим потомком (или дальше
 * наружу от него), но расстояние муж-жена остаётся неизменным.
 *
 * Юнит с детьми центрируется по x над серединой своих детей (та же логика
 * раздвижения по ширине поддерева, что и для предков, только вниз) — здесь
 * SIBLING_GAP_X оправдан: дети не "супруги" друг другу, это обычные соседи.
 *
 * Сиблинги (свои у фокуса, у любого предка, у сиблинга предка — сколько
 * угодно уровней): раскладываются с ВНЕШНЕЙ стороны от anchor-персоны, чей
 * это сиблинг (см. layoutAncestorsOfUnit), и каждый занимает не просто свой
 * обычный шаг, а descendantSubtreeWidth — фактическую ширину, которую
 * требует его поддерево потомков (может быть шире, если у сиблинга много
 * своих детей). Это гарантирует, что поддерево потомков сиблинга предка
 * (растущее вниз на то же Y, что и основное дерево фокуса, растущее вниз
 * независимо от него) физически не пересечётся с основным деревом —
 * порядок вызовов (см. buildTreeLayout) размещает весь путь фокуса первым,
 * так что к моменту, когда сиблинги предков раскладывают своих потомков,
 * основное дерево уже полностью на местах и его можно обходить стороной.
 *
 * Инварианты (см. CLAUDE.md TREE LAYOUT RULES), которым это обязано
 * следовать по мере роста:
 *  - фокус-персона всегда в x=0, y=0;
 *  - линии-коннекторы никогда не пересекаются;
 *  - дети всегда рядом со своими родителями;
 *  - предки мужа и жены расходятся строго в разные стороны.
 */
export function buildTreeLayout(
  graph: FamilyGraph,
  focusPersonId: string,
): TreeLayoutResult {
  const focus = graph.persons.find((p) => p.id === focusPersonId);
  if (!focus) {
    throw new Error(
      `buildTreeLayout: focus person "${focusPersonId}" not found in graph`,
    );
  }

  const personById = new Map(graph.persons.map((p) => [p.id, p]));

  // Юнит = сама персона + все её супруги, отсортированные муж-слева/жена-справа.
  const spouseIds = new Map<string, Set<string>>();
  for (const rel of graph.relationships) {
    if (rel.kind !== "spouse") continue;
    addSpouse(spouseIds, rel.from, rel.to);
    addSpouse(spouseIds, rel.to, rel.from);
  }

  const unitIdByPerson = new Map<string, string>();
  const units = new Map<string, PersonNodeData[]>();
  for (const person of graph.persons) {
    if (unitIdByPerson.has(person.id)) continue;
    const members = [person.id, ...(spouseIds.get(person.id) ?? [])];
    const sorted = [...new Set(members)]
      .map((id) => personById.get(id)!)
      .sort((a, b) => genderOrder(a.gender) - genderOrder(b.gender));
    const unitId = sorted.map((p) => p.id).join("+");
    for (const p of sorted) unitIdByPerson.set(p.id, unitId);
    units.set(unitId, sorted);
  }

  // Дети юнита = все, для кого хотя бы один член юнита — parent-child "from".
  const childrenOfUnit = new Map<string, Set<string>>();
  // Родители персоны = все "from" в parent-child, где эта персона — "to".
  const parentsOfPerson = new Map<string, Set<string>>();
  for (const rel of graph.relationships) {
    if (rel.kind !== "parent-child") continue;
    const unitId = unitIdByPerson.get(rel.from);
    if (unitId) {
      if (!childrenOfUnit.has(unitId)) childrenOfUnit.set(unitId, new Set());
      childrenOfUnit.get(unitId)!.add(rel.to);
    }
    if (!parentsOfPerson.has(rel.to)) parentsOfPerson.set(rel.to, new Set());
    parentsOfPerson.get(rel.to)!.add(rel.from);
  }

  const focusUnitId = unitIdByPerson.get(focusPersonId)!;
  const positions = new Map<string, { x: number; y: number }>();
  // Юниты, занимающие каждое generation (основное дерево фокуса, ветка
  // предков одного члена пары, сиблинг предка со своими потомками — что
  // угодно). Каждое такое поддерево регистрирует СЕБЯ (по unitId, НЕ по
  // застывшим x-координатам) после размещения (см. markOccupied /
  // recordOccupiedRange); любое НОВОЕ поддерево, вставая на то же Y,
  // проверяет пересечение (см. clearOverlap) и отодвигается наружу, если
  // задело уже занятое — именно так две независимые ветки (например,
  // предки Виктора и предки Галины, или сиблинг бабушки и основное дерево
  // фокуса) никогда не накладываются друг на друга, хотя ничего заранее
  // друг о друге не знают.
  //
  // ВАЖНО: раньше здесь хранились {min,max} СНЯТЫЕ ОДИН РАЗ в момент
  // регистрации — но x уже зарегистрированного юнита может ПОЗЖЕ измениться
  // (тот же unitId сдвигает shiftSubtree, когда СОСЕДНЯЯ, более глубокая
  // по рекурсии ветка обнаруживает коллизию и толкает поддерево, в которое
  // входит этот unitId) — застывший снимок координат тогда "врёт", и
  // clearOverlap считает пересечение по не соответствующим действительности
  // числам (см. историю: тесты с детьми Николая/Елены Ушкар — снимок
  // occupied-диапазона Виктора+Галины оставался в occupiedRanges со старыми
  // координатами уже после того, как более глубокая рекурсия сдвинула их
  // ветку, и итоговый push уводил новое поддерево ровно на то же место,
  // где в итоге оказалась Галина). Поэтому здесь хранятся ССЫЛКИ (unitId +
  // generation), а актуальный {min,max} всегда вычисляется заново из живых
  // positions в liveRangeOf/clearOverlap.
  const occupiedUnits = new Map<number, string[]>();

  // Порядок: сначала кладём фокус-юнит на фиксированный SPOUSE_GAP_X (не
  // растягивая под предков — расстояние муж-жена неизменно), затем ЕГО
  // потомков (Эва) от этого финального центра, регистрируем занятый
  // диапазон основного дерева, и только потом — предков (которые
  // раздвигаются наружу от каждого члена пары, не трогая саму пару).
  placeUnit(focusUnitId, 0, 0);
  layoutDescendantsOfUnit(focusUnitId, 0);
  recordOccupiedRange(focusUnitId, 0);
  layoutAncestorsOfUnit(focusUnitId, 0);

  // Инвариант "фокус-персона всегда в x=0" (CLAUDE.md).
  const focusX = positions.get(focusPersonId)!.x;
  for (const pos of positions.values()) pos.x -= focusX;

  const persons: LaidOutPerson[] = graph.persons.map((p) => {
    const pos = positions.get(p.id);
    if (!pos) {
      throw new Error(
        `buildTreeLayout: person "${p.id}" was not placed (unsupported graph shape)`,
      );
    }
    return { ...p, x: pos.x, y: pos.y };
  });

  return { persons, relationships: graph.relationships };

  /**
   * Раскладывает детей уже размещённого юнита `unitId` (читает его x из
   * positions — сам юнит не переставляет) вниз на generation + 1, и
   * рекурсивно — их собственных детей.
   */
  function layoutDescendantsOfUnit(unitId: string, generation: number): void {
    const children = [...(childrenOfUnit.get(unitId) ?? [])];
    if (children.length === 0) return;

    const centerX = centerOfMembers(units.get(unitId)!);
    const childUnitIds = [
      ...new Set(children.map((childId) => unitIdByPerson.get(childId)!)),
    ];
    const childWidths = childUnitIds.map((id) => descendantSubtreeWidth(id));
    const totalWidth = childWidths.reduce((sum, w) => sum + w, 0);

    let cursor = centerX - totalWidth / 2;
    for (let i = 0; i < childUnitIds.length; i++) {
      const width = childWidths[i];
      placeUnit(childUnitIds[i], cursor + width / 2, generation + 1);
      layoutDescendantsOfUnit(childUnitIds[i], generation + 1);
      cursor += width;
    }
  }

  /**
   * Ширина (в px), которую поддерево ПОТОМКОВ юнита `unitId` реально
   * занимает на его собственном поколении — как минимум его обычная ширина
   * (members.length * SIBLING_GAP_X), но шире, если у кого-то из его членов
   * есть дети, чьё поддерево (рекурсивно) шире этого. Используется вместо
   * фиксированного SIBLING_GAP_X при раскладке и обычных потомков, и (что
   * важнее) при раскладке потомков сиблинга предка — там два независимых
   * поддерева растут вниз на один и тот же Y, и без учёта фактической
   * ширины поддерева они могут физически совпасть по x (см. историю: дети
   * сиблинга бабушки/дедушки совпадали по x с фокус-юнитом на generation 0).
   */
  function descendantSubtreeWidth(unitId: string): number {
    const members = units.get(unitId)!;
    const ownWidth = members.length * SIBLING_GAP_X;

    const childIds = [...(childrenOfUnit.get(unitId) ?? [])];
    if (childIds.length === 0) return ownWidth;

    const childUnitIds = [
      ...new Set(childIds.map((childId) => unitIdByPerson.get(childId)!)),
    ];
    const childrenWidth = childUnitIds.reduce(
      (sum, id) => sum + descendantSubtreeWidth(id),
      0,
    );

    return Math.max(ownWidth, childrenWidth);
  }

  /** Регистрирует ОДИН юнит `unitId` как занимающий `generation` — без спуска к его потомкам (см. recordOccupiedRange для рекурсивной версии). Хранит только ссылку (unitId), не застывшие координаты — см. комментарий у occupiedUnits. */
  function markOccupied(generation: number, unitId: string): void {
    if (!occupiedUnits.has(generation)) occupiedUnits.set(generation, []);
    occupiedUnits.get(generation)!.push(unitId);
  }

  /** Вычисляет ЖИВОЙ x-диапазон юнита `unitId`, читая его ТЕКУЩИЕ positions (не застывший снимок). */
  function liveRangeOf(unitId: string): { min: number; max: number } {
    const xs = units.get(unitId)!.map((m) => positions.get(m.id)!.x);
    return {
      min: Math.min(...xs) - SIBLING_GAP_X / 2,
      max: Math.max(...xs) + SIBLING_GAP_X / 2,
    };
  }

  /**
   * Как clearOverlap, но: (1) спускается к потомкам `unitId` (unitId и его
   * сиблинги — уже размещённые "дети" родительской пары в childrenOfUnit) —
   * так что каскадный сдвиг родительской пары (см. shiftSubtree) сверяется
   * ПОЛНОСТЬЮ, на каждом задетом generation, а не только на generation самой
   * пары (см. историю: сдвиг пары вправо от одной коллизии заносил её
   * потомков прямо в ДРУГУЮ, ранее не пересекавшуюся ветку); (2) направление
   * толчка на каждой итерации вычисляется от факта, с какой стороны
   * находится КОНКРЕТНЫЙ пересёкшийся occupied-диапазон, а не от growLeft —
   * тот означает "с какой стороны СВОЕГО ЮНИТА растут мои сиблинги" и на
   * глубокой рекурсии может не совпадать с тем, в какую сторону от занятого
   * диапазона реально нужно уходить (см. историю: growLeft=true для Николая
   * Козловского увёл Василия+Елизавету ВЛЕВО, прямо в сторону уже занятой
   * Кривушами территории, вместо того чтобы разойтись).
   *
   * Нужно для родительской пары, которая сама (или её уже размещённые
   * "дети" — unitId и сиблинги) может физически задеть СОВСЕМ ДРУГУЮ,
   * независимую ветку предков на том же дереве (см. историю: Василий+
   * Елизавета Козловские вставали на то же место, где уже стояли Григорий+
   * Елизавета Кривуша — родители Елизаветы Купчик с другой стороны дерева).
   */
  function clearUnitOverlap(unitId: string): number {
    // Собственное поддерево unitId (он сам + рекурсивно все его потомки —
    // в т.ч. основное дерево фокуса, если unitId выше него по предкам) уже
    // где-то ЗАРЕГИСТРИРОВАНО отдельно (см. recordOccupiedRange у фокуса) —
    // если не исключить эти unitId из сравнения, поддерево окажется
    // "occupied само против себя" на каждой своей generation и будет
    // бесконечно толкать себя в одну сторону, никогда не сходясь (см.
    // историю: Виктор+Галина, включая Александра+Эву внутри их же
    // поддерева, толкались на +440 каждую итерацию против occupied-записи
    // САМОГО фокус-юнита на generation 0, зарегистрированной в начале
    // buildTreeLayout).
    const ownUnitIds = new Set(collectSubtreeUnitIds(unitId));

    let totalDelta = 0;
    for (let guard = 0; guard < 64; guard++) {
      let maxPush = 0;
      let pushRight = true;
      for (const [gen, range] of collectSubtreeRanges(
        unitId,
        generationOf(unitId),
      )) {
        const center = (range.min + range.max) / 2;
        for (const occupiedUnitId of occupiedUnits.get(gen) ?? []) {
          if (ownUnitIds.has(occupiedUnitId)) continue;
          const occupied = liveRangeOf(occupiedUnitId);
          if (range.min >= occupied.max || range.max <= occupied.min) continue;
          const occupiedCenter = (occupied.min + occupied.max) / 2;
          const goRight = center >= occupiedCenter;
          const push = goRight
            ? occupied.max - range.min
            : range.max - occupied.min;
          if (push > maxPush) {
            maxPush = push;
            pushRight = goRight;
          }
        }
      }

      if (maxPush === 0) break;
      const deltaX = pushRight ? maxPush : -maxPush;
      shiftSubtree(unitId, deltaX);
      totalDelta += deltaX;
    }
    return totalDelta;
  }

  /** Читает generation юнита `unitId` из уже записанных positions (все члены юнита стоят на одном Y). */
  function generationOf(unitId: string): number {
    const firstMemberId = units.get(unitId)![0].id;
    return positions.get(firstMemberId)!.y / GENERATION_GAP_Y;
  }

  /** Собирает unitId и все unitId его потомков (рекурсивно), по childrenOfUnit. */
  function collectSubtreeUnitIds(unitId: string): string[] {
    const result = [unitId];
    const childIds = [...(childrenOfUnit.get(unitId) ?? [])];
    const childUnitIds = [
      ...new Set(childIds.map((childId) => unitIdByPerson.get(childId)!)),
    ];
    for (const childUnitId of childUnitIds)
      result.push(...collectSubtreeUnitIds(childUnitId));
    return result;
  }

  /**
   * Регистрирует юнит `unitId` как занимающий `generation`, и рекурсивно
   * то же самое для всех его потомков. Вызывается после того, как
   * поддерево ПОЛНОСТЬЮ размещено
   * (сам юнит + все потомки вниз) — для основного дерева фокуса (см.
   * buildTreeLayout) и для сиблинга предка со всеми его потомками (см.
   * placeSiblingsBeside).
   *
   * НЕ подходит для родительской пары самой по себе (см.
   * layoutAncestorsOfUnit) — та не имеет "потомков" в смысле этой функции:
   * unitId и его сиблинги — её единственные дети, уже размещённые и
   * зарегистрированные РАНЬШЕ на их собственном (более низком) generation;
   * рекурсивный спуск отсюда наложил бы их диапазон поверх самого себя и
   * ошибочно "спутал" бы это с чужим занятым пространством (см. историю:
   * родительская пара получала occupied-диапазон, посчитанный по
   * положению её собственных, уже учтённых потомков).
   */
  function recordOccupiedRange(unitId: string, generation: number): void {
    markOccupied(generation, unitId);

    const childIds = [...(childrenOfUnit.get(unitId) ?? [])];
    const childUnitIds = [
      ...new Set(childIds.map((childId) => unitIdByPerson.get(childId)!)),
    ];
    for (const childUnitId of childUnitIds)
      recordOccupiedRange(childUnitId, generation + 1);
  }

  /**
   * Раскладывает предков ЮНИТА `unitId` (уже размещённого на `generation`,
   * читает его текущий x из positions) — то есть родителей каждого из его
   * членов, каждый строго над своим членом (муж/жена не смешиваются).
   * Родительская пара сама встаёт на фиксированный SPOUSE_GAP_X (как и
   * везде), центрированная над своим членом-потомком; если у НЕЁ самой
   * тоже есть широкие предки выше, дальнейшее раздвижение происходит на
   * следующем уровне рекурсии тем же способом — раздвигается не пара
   * родителей, а то, что стоит ЕЩЁ выше неё.
   *
   * Сиблинги: если у родителей есть и другие дети (кроме `unitId`), они
   * сначала расставляются рядом с `unitId` на ЕГО generation (см.
   * placeSiblingsBeside) — родительская пара центрируется уже над этой
   * серединой, а не только над `unitId`.
   */
  function layoutAncestorsOfUnit(unitId: string, generation: number): void {
    const members = units.get(unitId)!;

    for (const member of members) {
      const parentIds = parentsOfPerson.get(member.id);
      if (!parentIds || parentIds.size === 0) continue;

      const parentUnitIds = [
        ...new Set([...parentIds].map((id) => unitIdByPerson.get(id)!)),
      ];
      for (const parentUnitId of parentUnitIds) {
        // Сиблинги member'а по этому родительскому юниту — другие дети,
        // ещё нигде не размещённые (сам unitId уже стоит на своём месте).
        const siblingUnitIds = [...(childrenOfUnit.get(parentUnitId) ?? [])]
          .map((childId) => unitIdByPerson.get(childId)!)
          .filter(
            (id) => id !== unitId && !positions.has(units.get(id)![0].id),
          );

        // Сторона, с которой уходят сиблинги: member'а — ВНЕШНЯЯ сторона
        // его собственного юнита (unitId), не "любая свободная" — если
        // member стоит слева в unitId (муж), у него справа уже занято его
        // супругом/супругой, так что сиблинги должны идти ещё левее, а не
        // втискиваться между member'ом и его юнитом. Иначе линия к общему
        // ребёнку member'а (проходящая примерно по центру unitId) визуально
        // проходит вплотную к сиблингу, читаясь как "перепутанное родство"
        // (CLAUDE.md TREE LAYOUT RULES) даже без формальной x-коллизии.
        const unitMembers = units.get(unitId)!;
        const memberIndexInUnit = unitMembers.findIndex(
          (m) => m.id === member.id,
        );
        const growLeft = memberIndexInUnit === 0; // муж (левый член) → сиблинги ещё левее; жена (правый) → ещё правее.

        const parentCenterX = placeSiblingsBeside(
          member.id,
          siblingUnitIds,
          generation,
          growLeft,
        );
        // Родительская пара — фиксированный SPOUSE_GAP_X, центрированный
        // над parentCenterX (серединой между member'ом и его сиблингами).
        placeUnit(parentUnitId, parentCenterX, generation - 1);
        // Сама пара (и всё, что уже стоит под ней) может физически задеть
        // независимую ветку предков на этом же generation — см.
        // clearUnitOverlap.
        clearUnitOverlap(parentUnitId);

        // Регистрируем САМУ пару без рекурсивного спуска к ЕЁ ПОТОМКАМ
        // через recordOccupiedRange/clearOverlap — родительская пара САМА
        // не имеет потомков, которые нужно было бы заново сверять: unitId
        // и его сиблинги (Дарья и т.п.) — это и есть её единственные
        // "дети", уже размещённые и учтённые в occupiedRanges на СВОЁМ
        // (generation) уровне раньше. Если бы мы прогнали её через
        // clearOverlap/recordOccupiedRange с рекурсивным спуском (как для
        // сиблингов), это сравнило бы диапазон unitId+сиблингов САМ С
        // СОБОЙ на generation (та же территория, что уже occupied) и
        // ошибочно сдвинуло бы всю пару в сторону (см. историю: Виктор
        // получал occupied-диапазон, посчитанный по положению Александра
        // и Эвы, а не по своей и Галины позиции).
        markOccupied(generation - 1, parentUnitId);

        // Но `generation` (уровень unitId и его сиблингов — например,
        // Виктор+Галина на -220) САМ должен стать occupied для ЛЮБОЙ
        // ДРУГОЙ независимой ветки, которая может позже растить своих
        // ПОТОМКОВ на этот же Y (см. историю: сиблинг Николая Купчика —
        // Николай/Елена Ушкар — размещает своих детей на generation -220
        // через layoutDescendantsOfUnit/placeSiblingsBeside, но ничто не
        // регистрировало Виктора+Галину как занятую территорию на -220,
        // т.к. markOccupied(generation-1, ...) регистрирует только
        // РОДИТЕЛЬСКУЮ пару НА generation-1, а не unitId+сиблингов на
        // generation). Помечаем unitId и уже размещённых сиблингов здесь
        // явно — без рекурсии вниз (у unitId уже есть своя, отдельно
        // зарегистрированная ветка потомков — например, основное дерево
        // фокуса, зарегистрированное в самом начале buildTreeLayout).
        markOccupied(generation, unitId);
        for (const siblingUnitId of siblingUnitIds)
          markOccupied(generation, siblingUnitId);

        layoutAncestorsOfUnit(parentUnitId, generation - 1);
      }
    }
  }

  /**
   * Ставит сиблинги (`siblingUnitIds`, ещё не размещённые юниты) в ряд с
   * ОДНОЙ стороны (`growLeft` ? влево : вправо) от уже размещённого
   * `anchorPersonId`, на том же `generation` — не по обе стороны, чтобы не
   * оказаться между anchor'ом и его собственным юнитом-супругом (см.
   * вызывающий код). Каждый сиблинг занимает descendantSubtreeWidth (не
   * просто свой обычный шаг), и раскладывает свои собственные потомки —
   * порядок вызовов в buildTreeLayout гарантирует, что основное дерево
   * фокуса к этому моменту уже полностью на местах, так что раздвижение по
   * фактической ширине достаточно, чтобы не наложиться на него. Возвращает
   * x середины между anchor'ом и всеми его сиблингами — точку, над которой
   * нужно центрировать их общий родительский юнит.
   */
  function placeSiblingsBeside(
    anchorPersonId: string,
    siblingUnitIds: string[],
    generation: number,
    growLeft: boolean,
  ): number {
    const anchorX = positions.get(anchorPersonId)!.x;
    if (siblingUnitIds.length === 0) return anchorX;

    // Стартовый шаг между сиблингами — ВСЕГДА обычный SIBLING_GAP_X, а не
    // descendantSubtreeWidth: тот факт, что у сиблинга потом будут дети
    // (растущие вниз, на generation + 1), не обязан заранее раздувать его
    // слот СРЕДИ СИБЛИНГОВ на этом же уровне — этот слот нужен только для
    // самого сиблинга (и его супруга/супруги, если есть), а не для всего
    // поддерева. Реальные коллизии между поддеревьями потомков разных
    // сиблингов (или с чем-то ещё) ловит clearOverlap ниже, СДВИГАЯ только
    // при фактическом пересечении — не резервируя место заранее "на
    // всякий случай".
    const widths = siblingUnitIds.map(
      (id) => (units.get(id)?.length ?? 1) * SIBLING_GAP_X,
    );
    let cursor = anchorX + (growLeft ? -SIBLING_GAP_X / 2 : SIBLING_GAP_X / 2);
    const xs = [anchorX];

    siblingUnitIds.forEach((id, i) => {
      const width = widths[i];
      const memberCenterX = growLeft ? cursor - width / 2 : cursor + width / 2;
      placeUnit(id, memberCenterX, generation);
      layoutDescendantsOfUnit(id, generation);

      // Сиблинг сам по себе стоит на обычном шаге — но его ПОТОМКИ (уже
      // размещённые layoutDescendantsOfUnit выше) могли физически задеть
      // уже занятые независимые ветки (соседний сиблинг с его же
      // потомками, основное дерево фокуса и т.п.) — если это поддерево
      // (сиблинг + все его потомки) реально пересеклось с occupiedRanges
      // на каком-то Y, отталкиваем его целиком дальше наружу (в
      // направлении growLeft), пока не разойдётся.
      const deltaX = clearOverlap(id, generation, growLeft);
      recordOccupiedRange(id, generation);
      const finalCenterX = memberCenterX + deltaX;
      xs.push(
        finalCenterX - width / 2 - Math.abs(deltaX),
        finalCenterX + width / 2 + Math.abs(deltaX),
      );

      cursor += growLeft
        ? -(width + Math.abs(deltaX))
        : width + Math.abs(deltaX);
    });

    return (Math.min(...xs) + Math.max(...xs)) / 2;
  }

  /**
   * Проверяет, пересекается ли поддерево юнита `unitId` (уже размещённого
   * на `generation`, вместе со всеми его потомками) с любым уже
   * зарегистрированным occupied-юнитом на том же Y, и если да — сдвигает
   * всё поддерево целиком дальше наружу (`growLeft` ? левее : правее), пока
   * не разойдётся со всеми пересекавшимися диапазонами. Возвращает итоговую
   * дельту сдвига (0, если пересечений не было).
   *
   * Fixed-point цикл, а не один проход "вычислить max-push и применить":
   * поддерево может пересекаться с НЕСКОЛЬКИМИ occupied-диапазонами сразу
   * на разных generation своих потомков — взяв ОДИН max-push по наибольшему
   * требуемому сдвигу и применив его целиком, можно случайно "перелететь"
   * мимо ближней уже расчищенной коллизии и приземлиться на СОВСЕМ ДРУГОЙ,
   * ранее не пересекавшийся occupied-диапазон дальше в том же направлении
   * (см. историю: сиблинг Николая Козловского — Алексей — расталкиваясь от
   * одной коллизии на generation своих потомков, улетел далеко влево, за
   * пределы своей естественной "правой" стороны дерева, прямо в занятую
   * территорию Ушкаров/Виктора+Галины). Здесь `unitId` ещё НЕ зарегистрирован
   * в occupiedUnits на момент вызова (регистрация — после clearOverlap, см.
   * placeSiblingsBeside), так что самоисключение (как в clearUnitOverlap)
   * не требуется.
   */
  function clearOverlap(
    unitId: string,
    generation: number,
    growLeft: boolean,
  ): number {
    let totalDelta = 0;
    for (let guard = 0; guard < 64; guard++) {
      let maxPush = 0;
      for (const [gen, range] of collectSubtreeRanges(unitId, generation)) {
        for (const occupiedUnitId of occupiedUnits.get(gen) ?? []) {
          if (occupiedUnitId === unitId) continue; // сам с собой не сравниваем
          const occupied = liveRangeOf(occupiedUnitId);
          if (range.min >= occupied.max || range.max <= occupied.min) continue; // не пересекается
          const push = growLeft
            ? range.max - occupied.min
            : occupied.max - range.min;
          maxPush = Math.max(maxPush, push);
        }
      }

      if (maxPush === 0) break;
      const deltaX = growLeft ? -maxPush : maxPush;
      shiftSubtree(unitId, deltaX);
      totalDelta += deltaX;
    }
    return totalDelta;
  }

  /** Собирает [generation, {min,max}] для юнита `unitId` и рекурсивно всех его потомков, из уже записанных positions. */
  function collectSubtreeRanges(
    unitId: string,
    generation: number,
  ): [number, { min: number; max: number }][] {
    const xs = units.get(unitId)!.map((m) => positions.get(m.id)!.x);
    const result: [number, { min: number; max: number }][] = [
      [
        generation,
        {
          min: Math.min(...xs) - SIBLING_GAP_X / 2,
          max: Math.max(...xs) + SIBLING_GAP_X / 2,
        },
      ],
    ];

    const childIds = [...(childrenOfUnit.get(unitId) ?? [])];
    const childUnitIds = [
      ...new Set(childIds.map((childId) => unitIdByPerson.get(childId)!)),
    ];
    for (const childUnitId of childUnitIds) {
      result.push(...collectSubtreeRanges(childUnitId, generation + 1));
    }
    return result;
  }

  /** Сдвигает x всех уже размещённых карточек юнита `unitId` и рекурсивно всех его потомков на `deltaX`. */
  function shiftSubtree(unitId: string, deltaX: number): void {
    for (const member of units.get(unitId)!) {
      positions.get(member.id)!.x += deltaX;
    }
    const childIds = [...(childrenOfUnit.get(unitId) ?? [])];
    const childUnitIds = [
      ...new Set(childIds.map((childId) => unitIdByPerson.get(childId)!)),
    ];
    for (const childUnitId of childUnitIds) shiftSubtree(childUnitId, deltaX);
  }

  /** Ставит все карточки юнита (супругов) в один ряд по x вокруг centerX, на заданном поколении — фиксированным SPOUSE_GAP_X. Единственный способ разместить юнит — используется и для потомков, и для предков: расстояние муж-жена всегда одно и то же. */
  function placeUnit(
    unitId: string,
    centerX: number,
    generation: number,
  ): void {
    const members = units.get(unitId)!;
    const unitWidth = (members.length - 1) * SPOUSE_GAP_X;
    const startX = centerX - unitWidth / 2;
    members.forEach((member, i) => {
      positions.set(member.id, {
        x: startX + i * SPOUSE_GAP_X,
        y: generation * GENERATION_GAP_Y,
      });
    });
  }

  function centerOfMembers(members: PersonNodeData[]): number {
    const xs = members.map((m) => positions.get(m.id)!.x);
    return (Math.min(...xs) + Math.max(...xs)) / 2;
  }
}

function addSpouse(
  map: Map<string, Set<string>>,
  from: string,
  to: string,
): void {
  if (!map.has(from)) map.set(from, new Set());
  map.get(from)!.add(to);
}

function genderOrder(gender: PersonNodeData["gender"]): number {
  if (gender === "male") return 0;
  if (gender === "female") return 2;
  return 1;
}
