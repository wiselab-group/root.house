import type { NormalizedGraph } from "./types";
import type { PlacedPosition } from "./placement";
import {
  CARD_WIDTH,
  INTER_FAMILY_GAP,
  SPOUSE_GAP,
  branchesOf,
  measurePersonDescendantWidth,
  shouldBeLeft,
  type Branch,
} from "./subtree";

/**
 * tree-v3 — новое ядро размещения предков (§ пересмотр архитектуры,
 * product decision: "каждый родитель задаёт направление своей ветки,
 * подобно природному дереву, а к нему уже в свободное место крепятся
 * другие" — растим breadth-first по поколениям, а не depth-first по
 * одной стороне до конца, с одним узким локальным сдвигом вместо
 * разросшейся системы post-hoc проходов, см. collision.ts историю).
 *
 * Заменяет placeAncestorFork/placeAncestorPairUndirected/
 * placeFixedAnchorSiblingRow (placement.ts) и ВСЮ ancestor-специфичную
 * часть collision.ts (resolveGrandparentSymmetry →
 * resolveAncestorCoupleCollisionsAtGeneration →
 * resolveAdjacentAncestorCouples, cascadeShift, compactPaternalMaternalGap).
 *
 * Корневая причина, которую этот файл устраняет: старое размещение
 * предков было НАПРАВЛЕННО СЛЕПЫМ — paternal-линия (leftId) полностью
 * проходила рекурсию ВВЕРХ до конца, прежде чем maternal-линия (rightId)
 * вообще начинала размещаться (см. историю бага в placement.ts/
 * collision.ts) — ни одна сторона никогда не знала, насколько широкой
 * оказалась другая, и НЕСКОЛЬКО несвязанных пар предков на одном ряду
 * (не только "две половины") не отличались от настоящих paternal/
 * maternal соседей никаким структурным способом — сравнение "соседей по
 * X" могло случайно сопоставить двух ЧУЖИХ друг другу людей.
 *
 * Здесь вместо этого: поколения предков обрабатываются breadth-first, по
 * одному ряду (Y) целиком за раз, от ближайшего к фокусу до самого
 * глубокого. На каждом ряду — все "кластеры" (пара предков, либо
 * одинокий родитель), которым положено встать на этот Y, сначала
 * получают свою ЕСТЕСТВЕННУЮ позицию (та же самая математика
 * центрирования пары/sibling-row, что и раньше — просто вызывается один
 * раз на кластер, без переплетения с рекурсией), затем — один
 * детерминированный проход слева направо разводит их на корректный
 * минимальный зазор (SIBLING_GAP для настоящих родных сиблингов одной
 * семьи, INTER_FAMILY_GAP — для всех остальных, независимо от того,
 * сколько несвязанных кластеров оказалось на ряду). Единственный
 * "сдвигающий" примитив — nudgeCluster — узко ограничен ВЛАДЕНИЕМ
 * (map "кто чей", записанный ПРИ размещении, а не переоткрываемый обходом
 * графа постфактум) и НАПРАВЛЕНИЕМ (только вниз, к уже размещённым
 * поколениям — предки кластера ещё не размещены и просто заякорятся на
 * его финальную позицию, когда до их ряда дойдёт очередь) — поэтому не
 * может утечь через супружескую связь в чужую, несвязанную семью (см.
 * историю бага: Николай Козловский → Галина → Виктор Купчик, СОВСЕМ
 * другая семья).
 */

/** Один "кластер" на одном ряду поколения — пара предков (партнёрство) либо одинокий родитель, вместе со всем, что уже размещено "под" ним (см. layoutOneCluster). */
export interface RowCluster {
  /** partnershipId для пары, personId для одинокого родителя — стабильный ключ владения (ownerByPerson). */
  id: string;
  leftEdge: number;
  rightEdge: number;
  side: "paternal" | "maternal";
  /** id корня этой генеалогической линии (см. FrontierEntry.familyRootId) — отличает "настоящих" paternal/maternal соседей от случайных x-соседей из совершенно другой, не связанной родством ветки. */
  familyRootId: string;
  /** x потомка (ребёнка), над которым этот кластер должен центрироваться (§10) — используется только для диагностики/тестов, само центрирование уже заложено в preferredCenterX на момент вызова place(). */
  anchorChildX: number;
}

/** Минимальный зазор край-в-край между двумя соседними кластерами на одном ряду — SIBLING_GAP, если оба принадлежат ОДНОЙ семье (тот же familyRootId) — тогда это, по сути, сравнение родных сиблингов/дядь-тёть одной линии — иначе INTER_FAMILY_GAP (§11 "между семьями расстояние в 2 раза больше, чем между супругами"). */
function minGapBetween(a: RowCluster, b: RowCluster): number {
  return a.familyRootId === b.familyRootId ? SPOUSE_GAP * 2 : INTER_FAMILY_GAP;
}

/**
 * Реестр уже размещённых кластеров по каждому ряду (Y) — единственное
 * состояние, которое placeAncestorGeneration использует, чтобы решить,
 * нужно ли раздвигать соседей. НЕ хранит ничего кросс-поколенчески —
 * каждый Y независим (кластеры разных Y физически не могут столкнуться,
 * см. GENERATION_GAP ≫ CARD_HEIGHT).
 */
export class RowRegistry {
  private readonly byY = new Map<string, RowCluster[]>();

  private key(y: number): string {
    return String(y);
  }

  clustersAt(y: number): readonly RowCluster[] {
    return this.byY.get(this.key(y)) ?? [];
  }

  /**
   * Размещает новый кластер шириной `width`, естественно центрированный на
   * `preferredCenterX`, сдвигая его ровно настолько, чтобы обеспечить
   * минимальный зазор (minGapBetween) от уже зарегистрированного соседа
   * на этом ряду СО СТОРОНЫ, откуда он растёт (left-to-right sweep — если
   * кластер приходит с уже занятой территории слева, единственное
   * направление сдвига — вправо; это тот же детерминированный
   * left-to-right принцип, что и в предыдущем resolveResidualOverlaps, но
   * теперь применяется по одному Y за раз, при наличии полного
   * family/sibling контекста, а не как последний resort по всему дереву
   * сразу).
   *
   * Кластеры на одном Y ДОЛЖНЫ подаваться в порядке слева направо
   * (вызывающий код — placeAncestorGeneration — сортирует их перед
   * вызовом) — эта функция не переупорядочивает уже занесённые кластеры.
   */
  place(
    y: number,
    id: string,
    side: "paternal" | "maternal",
    familyRootId: string,
    preferredCenterX: number,
    width: number,
    anchorChildX: number,
  ): { centerX: number; delta: number } {
    const existing = this.byY.get(this.key(y)) ?? [];
    let centerX = preferredCenterX;
    // Ищем ближайшего уже занесённого соседа СЛЕВА от preferredCenterX (по
    // его собственному центру — leftEdge+rightEdge midpoint) — НЕЗАВИСИМО
    // от того, конфликтует ли он с нашим preferred-положением уже сейчас:
    // именно КОНФЛИКТУЮЩИЙ сосед (чей rightEdge заходит за наш preferred
    // left edge) — самый частый случай, требующий раздвижки, и раньше
    // здесь ошибочно искался только НЕконфликтующий сосед (rightEdge <=
    // preferredLeftEdge) — при реальном конфликте условие было ложным для
    // ВСЕХ существующих кластеров, leftNeighbor оставался undefined, и
    // функция вообще не пыталась развести (см. историю бага: Elizaveta
    // Kozlovskaya/Grigory Kolesnikovich падали ровно друг на друга, т.к.
    // единственный вызывающий эту логику случай — прямой конфликт — был
    // тем самым случаем, который не обрабатывался).
    let leftNeighbor: RowCluster | undefined;
    for (const c of existing) {
      const cCenter = (c.leftEdge + c.rightEdge) / 2;
      if (cCenter <= preferredCenterX) {
        if (!leftNeighbor) {
          leftNeighbor = c;
        } else {
          const leftNeighborCenter =
            (leftNeighbor.leftEdge + leftNeighbor.rightEdge) / 2;
          if (cCenter > leftNeighborCenter) leftNeighbor = c;
        }
      }
    }
    if (leftNeighbor) {
      const candidate: RowCluster = {
        id,
        side,
        familyRootId,
        anchorChildX,
        leftEdge: centerX - width / 2,
        rightEdge: centerX + width / 2,
      };
      const requiredGap = minGapBetween(leftNeighbor, candidate);
      const minLeftEdge = leftNeighbor.rightEdge + requiredGap;
      if (candidate.leftEdge < minLeftEdge) {
        centerX = minLeftEdge + width / 2;
      }
    }
    const delta = centerX - preferredCenterX;
    const cluster: RowCluster = {
      id,
      side,
      familyRootId,
      anchorChildX,
      leftEdge: centerX - width / 2,
      rightEdge: centerX + width / 2,
    };
    const list = this.byY.get(this.key(y));
    if (list) list.push(cluster);
    else this.byY.set(this.key(y), [cluster]);
    return { centerX, delta };
  }
}

/**
 * Единственный узкий примитив "сдвинуть уже размещённых соседей" во всём
 * новом ядре (заменяет collision.ts::cascadeShift целиком — BFS с
 * "legitimate node", stopId-границей, sibling-propagation-on-spouse-cross
 * — см. историю бага, самый много раз патченный код в проекте).
 *
 * Сдвигает РОВНО тех людей, кто уже был записан как "принадлежащий"
 * clusterId в ownerByPerson (заполняется как побочный эффект setPosition
 * ВО ВРЕМЯ размещения этого самого кластера — пара + супруг + весь ряд
 * детей + все их потомки, УЖЕ размещённые на момент вызова). НИКОГДА не
 * обходит граф заново — поэтому не может утечь через супружескую связь в
 * чужой, не относящийся к этому кластеру дом (в отличие от cascadeShift,
 * которая обнаруживала "легитимность" узла обходом графа постфактум и
 * поэтому была уязвима к тому, что "легитимный" узел через свою
 * супружескую связь утаскивал СОВСЕМ другую, несвязанную семью).
 *
 * Направленность: вызывается ТОЛЬКО из RowRegistry.place() контекста
 * (через placeAncestorGeneration) для уже размещённого, более глубокого
 * поколения — предки кластера (Y-1 и выше) на этот момент ЕЩЁ НЕ
 * размещены и в ownerByPerson не входят: они появятся позже, заякоренные
 * на уже финальную (после сдвига) позицию кластера — поэтому им не нужно
 * "подтягиваться" отдельно, они просто увидят обновлённый anchorChildX.
 */
export function nudgeCluster(
  clusterId: string,
  delta: number,
  ownerByPerson: Map<string, string>,
  positionByPerson: Map<string, PlacedPosition>,
): void {
  if (delta === 0) return;
  for (const [personId, owner] of ownerByPerson) {
    if (owner !== clusterId) continue;
    const pos = positionByPerson.get(personId);
    if (pos) pos.x += delta;
  }
}

/** Запись во frontier-очереди generation-batch обхода (см. placement.ts::placeGraph). */
export interface FrontierEntry {
  /** Человек, чьи родители нужно разместить на следующем (более глубоком) ряду. */
  personId: string;
  /** x уже размещённой карточки personId — родительская пара центрируется вокруг него. */
  anchorX: number;
  y: number;
  side: "paternal" | "maternal";
  /** id корня этой генеалогической линии — см. RowCluster.familyRootId. Наследуется без изменений вверх по дереву. */
  familyRootId: string;
}

/** Определяет paternal/maternal сторону по person.branch (§7/§8) — "unknown" (супруг, женившийся в чью-то линию) наследует сторону супруга, которую вызывающий код обязан передать явно через fallbackSide. */
export function sideOf(
  graph: NormalizedGraph,
  personId: string,
  fallbackSide: "paternal" | "maternal",
): "paternal" | "maternal" {
  const branch = graph.personById.get(personId)?.branch;
  if (branch === "paternal") return "paternal";
  if (branch === "maternal") return "maternal";
  return fallbackSide;
}

/** Полные сиблинги personId (та же пара родителей, §11) — перенесено дословно из старого placement.ts::fullSiblingsOf (не связано с ancestor-side redesign, поведение не меняется). */
function fullSiblingsOf(graph: NormalizedGraph, personId: string): string[] {
  const person = graph.personById.get(personId);
  if (!person || person.parentIds.length === 0) return [];
  const referenceSet = new Set(person.parentIds);
  const firstParentId = person.parentIds[0];
  const branches = branchesOf(graph, firstParentId);
  const seen = new Set<string>([personId]);
  const result: string[] = [];
  for (const branch of branches) {
    for (const childId of branch.childrenIds) {
      if (seen.has(childId)) continue;
      const childParentIds = graph.personById.get(childId)?.parentIds ?? [];
      const sameParents =
        childParentIds.length === referenceSet.size &&
        childParentIds.every((id) => referenceSet.has(id));
      if (!sameParents) continue;
      seen.add(childId);
      result.push(childId);
    }
  }
  return result;
}

/** Callback-и из placement.ts, которые layoutOneCluster переиспользует — избегает дублирования "разместить потомков этого человека" (не входит в объём этого пересмотра, §1a плана). */
export interface DescendantPlacer {
  setPosition(personId: string, x: number, y: number): void;
  /** true, если personId уже был размещён ЛЮБЫМ предыдущим вызовом (once-only guard, §17). */
  isPlaced(personId: string): boolean;
  placeDescendantBranches(personId: string, personX: number, y: number): void;
  /** slotAnchorX — смещает personId внутри его слота так, чтобы под будущего супруга осталось место на нужной (husband-left/wife-right) стороне. */
  slotAnchorX(personId: string, slotCenter: number): number;
}

/** Итог размещения одного кластера (пара предков + их родные сиблинги) — leftEdge/rightEdge идут в RowRegistry, ownedPersonIds — в ownerByPerson (см. nudgeCluster). */
interface ClusterLayout {
  clusterId: string;
  leftEdge: number;
  rightEdge: number;
  centerX: number;
  ownedPersonIds: string[];
  /** aId/bId — id пары (если parentIds.length===2), либо [primaryParentId] для одинокого родителя — нужны вызывающему коду, чтобы построить frontier следующего поколения. */
  parentIds: string[];
}

const HALF_SPAN = (CARD_WIDTH + SPOUSE_GAP) / 2;

/**
 * Зазор между двумя соседними сиблингами в ряду (§11) — узкий SPOUSE_GAP,
 * если у ОБОИХ нет собственного партнёрства, иначе SIBLING_GAP. Дословно
 * перенесённое правило (см. историю в старом placement.ts::
 * siblingGapBetween) — используется здесь только "внутри" одного кластера
 * (родные дядья/тёти), не между разными кластерами (там — INTER_FAMILY_GAP
 * через RowRegistry, см. minGapBetween выше).
 */
function siblingGapBetween(
  graph: NormalizedGraph,
  idA: string,
  idB: string,
): number {
  const hasNoPartnership = (id: string) =>
    !branchesOf(graph, id).some((b) => b.type === "partnership");
  return hasNoPartnership(idA) && hasNoPartnership(idB)
    ? SPOUSE_GAP
    : SPOUSE_GAP * 2; // SIBLING_GAP === 2×SPOUSE_GAP by construction, subtree.ts
}

/**
 * Направление роста ряда сиблингов `rootId` (§9/§11): "прочь от супруга"
 * — если у rootId есть РОВНО одно partnership-branch, супруг уже занял
 * одну сторону (husband-left/wife-right), сиблинги растут в свободную,
 * противоположную сторону. Без ровно одного партнёрства (нет брака, либо
 * ремарьяж) — растим влево по умолчанию (та же логика, что и старое
 * freeDirectionGrowsLeft/leftGrowLeft для paternal половины).
 */
function siblingRowGrowsLeft(
  graph: NormalizedGraph,
  rootId: string,
  defaultGrowLeft: boolean,
): boolean {
  const branches = branchesOf(graph, rootId);
  const partnershipBranches = branches.filter(
    (b): b is Extract<Branch, { type: "partnership" }> =>
      b.type === "partnership",
  );
  if (partnershipBranches.length !== 1) return defaultGrowLeft;
  const spouse = graph.personById.get(partnershipBranches[0].spouseId)!;
  const person = graph.personById.get(rootId)!;
  const personIsLeftOfSpouse = shouldBeLeft(
    person.gender,
    spouse.gender,
    rootId,
    partnershipBranches[0].spouseId,
  );
  // Супруг занял ПРАВУЮ сторону (personIsLeftOfSpouse) ⇒ сиблинги растут
  // ЕЩЁ ЛЕВЕЕ (прочь от супруга); супруг слева (!personIsLeftOfSpouse) ⇒
  // сиблинги растут вправо.
  return personIsLeftOfSpouse;
}

/**
 * Размещает ОДИН кластер целиком: сиблинги самого `personId` на ЕГО
 * СОБСТВЕННОМ ряду `y` (центрированные на `anchorX` — та же логика, что
 * раньше в placeFixedAnchorSiblingRow при первом, "снизу", вызове), затем
 * пара его родителей (или одинокий родитель), центрированная НАД этим
 * рядом (personId + его сиблинги, §10 own-child centering), затем родные
 * сиблинги (дядья/тёти personId'а) каждого из родителей — растущие ПРОЧЬ
 * от своего партнёра на ТОМ ЖЕ ряду, что и сама родительская пара.
 *
 * БЕЗ growLeft/chained/occupiedEdge параметров старого кода: каждый
 * кластер теперь полностью самодостаточен и не знает о соседях на своём
 * ряду — это ответственность RowRegistry.place() у вызывающего кода
 * (placeAncestorGeneration), не этой функции.
 */
function layoutOneCluster(
  graph: NormalizedGraph,
  personId: string,
  anchorX: number,
  personY: number,
  positionByPerson: Map<string, PlacedPosition>,
  ownerByPerson: Map<string, string>,
  placer: DescendantPlacer,
  generationGap: number,
): ClusterLayout | undefined {
  const person = graph.personById.get(personId);
  const parentIds = person?.parentIds ?? [];
  if (parentIds.length === 0) return undefined;

  const ownedPersonIds: string[] = [];
  // clusterId присваивается ПОСЛЕ того, как известны leftId/rightId (либо
  // soloParentId) — но trackOwner нужен уже для сиблингов personId'а на
  // шаге 0 (они принадлежат ТОЙ ЖЕ клетке, что и родительская пара, раз
  // именно эта пара их и породила). Откладываем trackOwner-вызовы для
  // шага 0 до момента, когда clusterId уже известен (см. ниже).
  const pendingOwnerIds: string[] = [];

  // Шаг 0 — сиблинги personId'а (a, c рядом с b) на ЕГО СОБСТВЕННОМ ряду
  // (personY, НЕ ряд родителей) — если ещё не размещены каким-то другим
  // путём (обычно НЕ размещены: personId либо сам фокус — единственный
  // способ узнать о его сиблингах это отсюда, либо кто-то, чьи сиблинги
  // уже разместил putChildrenRow его родителя — но фокус НЕ имеет
  // родителя, размещающего его через putChildrenRow, поэтому этот шаг
  // обязателен именно для случая "personId — фокус").
  const rowGrowsLeft = siblingRowGrowsLeft(graph, personId, false);
  let rowMinX = anchorX - CARD_WIDTH / 2;
  let rowMaxX = anchorX + CARD_WIDTH / 2;
  {
    const siblingIds = fullSiblingsOf(graph, personId);
    let cursor = rowGrowsLeft ? anchorX - CARD_WIDTH / 2 : anchorX + CARD_WIDTH / 2;
    let prevId = personId;
    for (const siblingId of siblingIds) {
      if (placer.isPlaced(siblingId)) {
        const pos = positionByPerson.get(siblingId)!;
        rowMinX = Math.min(rowMinX, pos.x - CARD_WIDTH / 2);
        rowMaxX = Math.max(rowMaxX, pos.x + CARD_WIDTH / 2);
        pendingOwnerIds.push(siblingId);
        prevId = siblingId;
        continue;
      }
      const width = measurePersonDescendantWidth(graph, siblingId);
      const gap = siblingGapBetween(graph, prevId, siblingId);
      cursor += rowGrowsLeft ? -(gap + width) : gap + width;
      const centerX = rowGrowsLeft ? cursor + width / 2 : cursor - width / 2;
      const siblingOwnX = placer.slotAnchorX(siblingId, centerX);
      placer.setPosition(siblingId, siblingOwnX, personY);
      placer.placeDescendantBranches(siblingId, centerX, personY);
      pendingOwnerIds.push(siblingId);
      rowMinX = Math.min(rowMinX, centerX - width / 2);
      rowMaxX = Math.max(rowMaxX, centerX + width / 2);
      prevId = siblingId;
    }
  }
  const rowCenterX = (rowMinX + rowMaxX) / 2;
  const y = personY - generationGap;

  const trackOwner = (id: string, clusterId: string) => {
    if (!ownerByPerson.has(id)) ownerByPerson.set(id, clusterId);
    ownedPersonIds.push(id);
  };

  if (parentIds.length === 1) {
    const soloParentId = parentIds[0];
    const clusterId = soloParentId;
    if (!placer.isPlaced(soloParentId)) {
      placer.setPosition(soloParentId, rowCenterX, y);
      placer.placeDescendantBranches(soloParentId, rowCenterX, y);
    }
    trackOwner(soloParentId, clusterId);
    for (const id of pendingOwnerIds) trackOwner(id, clusterId);
    return {
      clusterId,
      leftEdge: rowCenterX - CARD_WIDTH / 2,
      rightEdge: rowCenterX + CARD_WIDTH / 2,
      centerX: rowCenterX,
      ownedPersonIds,
      parentIds: [soloParentId],
    };
  }

  const [aId, bId] = parentIds;
  const a = graph.personById.get(aId)!;
  const b = graph.personById.get(bId)!;
  const isALeft = shouldBeLeft(a.gender, b.gender, aId, bId);
  const [leftId, rightId] = isALeft ? [aId, bId] : [bId, aId];

  const clusterId = `${leftId}|${rightId}`;
  const alreadyPlaced = placer.isPlaced(leftId) || placer.isPlaced(rightId);

  if (!alreadyPlaced) {
    placer.setPosition(leftId, rowCenterX - HALF_SPAN, y);
    placer.setPosition(rightId, rowCenterX + HALF_SPAN, y);
  }
  trackOwner(leftId, clusterId);
  trackOwner(rightId, clusterId);
  for (const id of pendingOwnerIds) trackOwner(id, clusterId);

  // Собственные родные сиблинги (дядья/тёти personId'а) каждой половины
  // пары растут ПРОЧЬ от партнёра — leftId (муж) влево, rightId (жена)
  // вправо — тот же принцип, что и freeDirectionGrowsLeft для фокуса (§9),
  // применённый локально к каждой стороне пары, без "chained"/occupiedEdge
  // координации с соседними кластерами (та координация теперь целиком у
  // RowRegistry, после того как естественная ширина ВСЕГО кластера уже
  // посчитана здесь).
  let minX = rowCenterX - HALF_SPAN - CARD_WIDTH / 2;
  let maxX = rowCenterX + HALF_SPAN + CARD_WIDTH / 2;

  const growSiblingRow = (rootId: string, growLeft: boolean): void => {
    const siblingIds = fullSiblingsOf(graph, rootId);
    const rootPos = positionByPerson.get(rootId)!;
    let cursor = growLeft
      ? rootPos.x - CARD_WIDTH / 2
      : rootPos.x + CARD_WIDTH / 2;
    let prevId = rootId;
    for (const siblingId of siblingIds) {
      if (placer.isPlaced(siblingId)) {
        // Уже размещён другим путём (напр. другой кластер этого же ряда
        // ссылается на того же человека — не должно происходить при
        // корректных данных, но не корраптим граф молча, §32).
        const pos = positionByPerson.get(siblingId)!;
        minX = Math.min(minX, pos.x - CARD_WIDTH / 2);
        maxX = Math.max(maxX, pos.x + CARD_WIDTH / 2);
        trackOwner(siblingId, clusterId);
        prevId = siblingId;
        continue;
      }
      const width = measurePersonDescendantWidth(graph, siblingId);
      const gap = siblingGapBetween(graph, prevId, siblingId);
      cursor += growLeft ? -(gap + width) : gap + width;
      const centerX = growLeft ? cursor + width / 2 : cursor - width / 2;
      const siblingOwnX = placer.slotAnchorX(siblingId, centerX);
      placer.setPosition(siblingId, siblingOwnX, y);
      placer.placeDescendantBranches(siblingId, centerX, y);
      trackOwner(siblingId, clusterId);
      minX = Math.min(minX, centerX - width / 2);
      maxX = Math.max(maxX, centerX + width / 2);
      prevId = siblingId;
    }
  };

  if (!alreadyPlaced) {
    growSiblingRow(leftId, true);
    growSiblingRow(rightId, false);
  }

  return {
    clusterId,
    leftEdge: minX,
    rightEdge: maxX,
    centerX: rowCenterX,
    ownedPersonIds,
    parentIds: [leftId, rightId],
  };
}

/**
 * Строит generation −1 (родители фокуса) frontier — единственная запись,
 * НЕ порождённая placeAncestorGeneration (все дальнейшие поколения строятся
 * им же, см. placement.ts::placeGraph). familyRootId у обоих родителей
 * фокуса РАЗНЫЙ — каждый определяет корень СВОЕЙ генеалогической линии
 * (см. FrontierEntry.familyRootId).
 */
export function collectAncestorFrontier(
  graph: NormalizedGraph,
  focusPersonId: string,
  focusX: number,
  focusY: number,
): FrontierEntry[] {
  const focus = graph.personById.get(focusPersonId);
  const parentIds = focus?.parentIds ?? [];
  if (parentIds.length === 0) return [];
  if (parentIds.length === 1) {
    const soloParentId = parentIds[0];
    const side = sideOf(graph, soloParentId, "paternal");
    return [
      {
        personId: focusPersonId,
        anchorX: focusX,
        y: focusY,
        side,
        familyRootId: soloParentId,
      },
    ];
  }
  // Для ровно двух родителей — единственная запись на самого focusPersonId
  // (не по одной на каждого родителя): layoutOneCluster сама достаёт ОБА
  // parentIds внутри себя и размещает их как пару (§9). placeAncestorGeneration
  // строит ДВЕ отдельные записи следующего поколения ПОСЛЕ этого — по одной
  // на каждого из уже размещённых leftId/rightId, каждая со своей стороной
  // (paternal/maternal), определённой через sideOf(graph, parentId, ...) от
  // person.branch (§7/§8) — не здесь. `side` в этой самой первой записи
  // никогда не читается layoutOneCluster (она смотрит только на personId),
  // так что значение-заглушка ниже безопасно.
  return [
    {
      personId: focusPersonId,
      anchorX: focusX,
      y: focusY,
      side: "paternal",
      familyRootId: focusPersonId,
    },
  ];
}

/**
 * Размещает ВСЕ кластеры, положенные на ряду `y` (одно поколение предков
 * across the WHOLE tree — не одна ветка), затем возвращает frontier
 * следующего (более глубокого) поколения.
 *
 * Каждая запись frontier — это ОДИН человек `personId`, чьи родители нужно
 * разместить здесь. Несколько entries на одном Y — обычное дело (напр.
 * Виктор и Галина оба на generation −1, каждый требует своей пары
 * родителей на generation −2, см. §41 CASE C).
 */
export function placeAncestorGeneration(
  entries: FrontierEntry[],
  graph: NormalizedGraph,
  positionByPerson: Map<string, PlacedPosition>,
  ownerByPerson: Map<string, string>,
  registry: RowRegistry,
  placer: DescendantPlacer,
  generationGap: number,
): FrontierEntry[] {
  if (entries.length === 0) return [];
  const y = entries[0].y;

  // Естественная (ещё не разведённая от соседей) позиция каждого кластера
  // — считается ДО сортировки/сведения, т.к. каждый кластер полностью
  // самодостаточен (см. layoutOneCluster).
  const layouts: { entry: FrontierEntry; layout: ClusterLayout }[] = [];
  const seenClusterIds = new Set<string>();
  for (const entry of entries) {
    const layout = layoutOneCluster(
      graph,
      entry.personId,
      entry.anchorX,
      entry.y,
      positionByPerson,
      ownerByPerson,
      placer,
      generationGap,
    );
    if (!layout) continue;
    if (seenClusterIds.has(layout.clusterId)) continue; // дедупликация — несколько entries могут указывать на одну и ту же пару родителей (полные сиблинги, §11).
    seenClusterIds.add(layout.clusterId);
    layouts.push({ entry, layout });
  }
  if (layouts.length === 0) return [];

  // Сортируем строго слева направо по естественной центру — RowRegistry
  // разводит только соседей в этом порядке (см. её комментарий).
  layouts.sort((x, y2) => x.layout.centerX - y2.layout.centerX);

  const parentGenerationY = y - generationGap;
  const nextFrontier: FrontierEntry[] = [];
  for (const { entry, layout } of layouts) {
    const width = layout.rightEdge - layout.leftEdge;
    const naturalCenterX = layout.centerX;
    const { delta } = registry.place(
      parentGenerationY,
      layout.clusterId,
      entry.side,
      entry.familyRootId,
      naturalCenterX,
      width,
      layout.centerX,
    );
    if (delta !== 0) {
      nudgeCluster(layout.clusterId, delta, ownerByPerson, positionByPerson);
    }

    // familyRootId РАСХОДИТСЯ на пару разных значений на КАЖДОМ уровне, где
    // у entry РОВНО 2 родителя (не только у самого фокуса!) — leftId и
    // rightId — это ВСЕГДА два человека из ДВУХ разных, независимых
    // родительских линий (даже если они сами супруги друг другу — их
    // СОБСТВЕННЫЕ родители, на следующем уровне, обычно совершенно
    // несвязанные семьи, случайно оказавшиеся на одном ряду). Каждый
    // получает СВОЙ собственный id как familyRootId, а не наследует общий
    // familyRootId родителя (см. историю бага: Василий+Елизавета Козловские
    // (родители Николая Козловского) и Григорий+Аграфена Колесникович
    // (родители Надежды — жены Николая Козловского) — Николай Козловский и
    // Надежда сами получены ОДНИМ вызовом layoutOneCluster (они пара), их
    // familyRootId был общим, и это НЕПРАВИЛЬНО наследовалось их
    // СОБСТВЕННЫМ, совершенно не связанным друг с другом родителям —
    // RowRegistry считал их "одной семьёй" и не разводил на
    // INTER_FAMILY_GAP, они падали точно друг на друга).
    //
    // Единственное исключение — одинокий родитель (parentIds.length===1):
    // там расходиться некому, familyRootId наследуется без изменений.
    const shouldFork = layout.parentIds.length === 2;
    for (const parentId of layout.parentIds) {
      const pos = positionByPerson.get(parentId);
      if (!pos) continue;
      const side = sideOf(graph, parentId, entry.side);
      nextFrontier.push({
        personId: parentId,
        anchorX: pos.x,
        y: parentGenerationY,
        side,
        familyRootId: shouldFork ? parentId : entry.familyRootId,
      });
    }
  }
  return nextFrontier;
}
