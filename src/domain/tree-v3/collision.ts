import type { NormalizedGraph } from "./types";
import { CARD_WIDTH, SIBLING_GAP } from "./subtree";
import { GENERATION_GAP, type PlacedPosition } from "./placement";

/** Высота карточки — используется вместе с CARD_WIDTH для bounding box (§23/§24). Совпадает по духу с card-geometry.ts во view-слое, но domain не импортирует оттуда (§ domain изолирован от React). */
export const CARD_HEIGHT = 176;

/** Минимальный зазор край-в-край, который ДОЛЖЕН оставаться между любыми двумя карточками, не входящими в одну пару — используется как порог обнаружения коллизий, отдельно от layout-констант (SIBLING_GAP и т.п. управляют ЖЕЛАЕМЫМ расстоянием при размещении; MIN_GAP — это то, ниже чего уже считается багом). */
export const MIN_GAP = 8;

export interface OverlapReport {
  personAId: string;
  personBId: string;
  overlapX: number;
  overlapY: number;
}

/**
 * §23 — геометрическая проверка постфактум: для каждой пары карточек считаем
 * bounding box и убеждаемся, что они не пересекаются (с учётом MIN_GAP).
 * O(n²) в лоб (§42: "avoid obvious O(n²) where a simple spatial structure
 * would help" — но корректность важнее; при текущем масштабе (~50-300 персон)
 * n² полностью приемлемо и не единственное узкое место в пайплайне).
 * Группируем по Y в bucket'ы (округление до GENERATION_GAP/2) как дешёвую
 * spatial-оптимизацию: карточки на радикально разных Y не могут
 * пересекаться (высота карточки << GENERATION_GAP), так что сравниваем
 * только внутри одного bucket'а — O(n²) остаётся, но с намного меньшей
 * константой на практике.
 */
export function detectOverlaps(
  positionByPerson: Map<string, PlacedPosition>,
): OverlapReport[] {
  const entries = [...positionByPerson.entries()];
  const overlaps: OverlapReport[] = [];

  const bucketOf = (y: number) => Math.round(y / (GENERATION_GAP / 2));
  const byBucket = new Map<number, typeof entries>();
  for (const entry of entries) {
    const bucket = bucketOf(entry[1].y);
    for (const b of [bucket - 1, bucket, bucket + 1]) {
      if (!byBucket.has(b)) byBucket.set(b, []);
    }
    byBucket.get(bucket)!.push(entry);
  }

  const checked = new Set<string>();
  for (const [bucket, bucketEntries] of byBucket) {
    void bucket;
    for (let i = 0; i < bucketEntries.length; i++) {
      for (let j = i + 1; j < bucketEntries.length; j++) {
        const [idA, posA] = bucketEntries[i];
        const [idB, posB] = bucketEntries[j];
        const pairKey = idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
        if (checked.has(pairKey)) continue;
        checked.add(pairKey);

        const overlapX = CARD_WIDTH - Math.abs(posA.x - posB.x);
        const overlapY = CARD_HEIGHT - Math.abs(posA.y - posB.y);
        if (overlapX > -MIN_GAP && overlapY > -MIN_GAP) {
          overlaps.push({ personAId: idA, personBId: idB, overlapX, overlapY });
        }
      }
    }
  }

  return overlaps;
}

/**
 * Минимальный зазор, который resolveResidualOverlaps оставляет между
 * соседними карточками после раздвижки — НЕМНОГО больше MIN_GAP (порог
 * обнаружения), чтобы раздвинутые карточки не оказывались ровно на грани
 * нового обнаружения, но НЕ настолько больше, чтобы sweep безусловно
 * раздвигал ЛЮБЫХ соседей в Y-группе до этого расстояния (см. requiredGap
 * ниже) — sweep применяется ко ВСЕМ соседям одного Y-bucket'а, включая уже
 * бесконфликтные пары, а не только к реально коллидирующим (упрощение ради
 * детерминизма single-pass'а, §25) — раньше здесь стояло 24 (requiredGap=
 * 200), и это безусловно раздвигало ЛЮБУЮ пару независимо выросших предков
 * без сиблингов (напр. Николай Козловский/Надежда Козловская) на 200px
 * между центрами, даже когда собственный placement-clamp уже гарантировал
 * отсутствие реальной коллизии при заметно меньшем зазоре — пара уезжала
 * далеко от своего anchor'а (Галины), разрывая parent-child линию изломом
 * (см. историю бага).
 */
const RESOLUTION_GAP = 12;

/** Целевой (максимально допустимый эстетически) зазор между ближайшими краями отцовской и материнской половин на любом общем Y — тот же порядок величины, что и SIBLING_GAP, чтобы обе половины читались как единое компактное дерево, а не как два далёких острова (§ layout compactness, product feedback: "должно быть всё компактно"). */
const HALF_PLANE_TARGET_GAP = 96;

/**
 * §7/§8/§9 дают paternal (влево) и maternal (вправо) половины ДВЕ независимо
 * зарезервированные территории — каждая растёт только исходя из ширины
 * собственных предков (measure-then-place, §12), ничего не зная о том,
 * насколько широко разрослась ДРУГАЯ половина. На реальных данных (много
 * сиблингов и по papa-, и по mama-линии) это оставляет между половинами
 * пустой зазор в тысячи пикселей — структурно корректно (нет коллизий, нет
 * пересечений линий, папина линия строго слева, мамина строго справа), но
 * визуально нечитаемо: ствол-коннектор одной половины и ствол-коннектор
 * другой, случайно совпав по Y (общее поколение), выглядят как ОДНА сплошная
 * линия через пустоту — читается как "перепутанное родство", хотя данные
 * верны (см. историю бага, разобрано в финальном отчёте).
 *
 * Это ЖЁСТКАЯ (rigid) трансляция целиком paternal-кластера вправо и/или
 * целиком maternal-кластера влево — НЕ точечное перемещение отдельных
 * карточек: сохраняет 1:1 всю внутреннюю геометрию каждой половины (никакая
 * новая коллизия внутри половины невозможна по построению), схлопывает
 * только МЕЖДУ половинами пустоту сверх HALF_PLANE_TARGET_GAP. Единственная
 * "чужая" карточка, которую нельзя трогать — сам фокус и его прямые
 * потомки/супруг(и) (branch: "focus"/"descendant") — они остаются на месте,
 * т.к. половины считаются от НИХ (paternal/maternal — это только предки
 * фокуса и их боковые ветви, §7/§8).
 *
 * Поколение САМИХ родителей фокуса (focus.generation − 1) целиком выведено из
 * этой функции — не входит ни в paternalIds/maternalIds, ни в сдвиг. Отец
 * (paternal) и мать (maternal) фокуса физически СОСЕДНЯЯ супружеская пара
 * (§9 — "супруги всегда рядом") с намеренно узким SPOUSE_GAP между ними — это
 * не "зазор между двумя половинами дерева", а сама точка их стыка: если
 * позволить их сдвинуть навстречу друг другу наравне с остальными предками,
 * их и без того узкий зазор рискует схлопнуться до коллизии. Компактится
 * только то, что СТРОГО ВЫШЕ этого ряда (бабушки/дедушки и далее,
 * generation ≤ focus.generation − 2) — там paternal/maternal действительно
 * две независимые линии без обязательной близости (см. историю бага:
 * Юзик/Даниил/Алексей Козловские и Пётр/Яков Козловские оставались за
 * тысячи пикселей от paternal-стороны, т.к. более ранняя версия сдвигала ВСЮ
 * half-plane целиком, но допустимый сдвиг был ограничен узким зазором
 * Виктор↔Галина).
 */
export function compactPaternalMaternalGap(
  positionByPerson: Map<string, PlacedPosition>,
  graph: NormalizedGraph,
): void {
  const focusGeneration =
    graph.personById.get(graph.focusPersonId)?.generation ?? 0;
  const parentGeneration = focusGeneration - 1;

  const paternalIds: string[] = [];
  const maternalIds: string[] = [];
  for (const person of graph.personById.values()) {
    if (person.generation >= parentGeneration) continue; // родители фокуса (и всё не старше них) не трогаются.
    if (person.branch === "paternal") paternalIds.push(person.id);
    else if (person.branch === "maternal") maternalIds.push(person.id);
  }

  // "unknown"-branch персоны (женившиеся В paternal/maternal линию — напр.
  // Николай Ушкар, супруг Елены Ушкар — computeBranches не проводит родство
  // ДЛЯ них самих, у них нет предков/потомков фокуса, только брак) ДОЛЖНЫ
  // ехать ВМЕСТЕ со своим уже классифицированным супругом — иначе супруг
  // сдвигается компакцией, а женившийся-в-линию человек остаётся на месте,
  // разрывая их обязательную близость (§9 — см. историю бага: Николай Ушкар
  // оставался на x=-3200, пока его жена Елена уезжала на x=-1464).
  const paternalSet = new Set(paternalIds);
  const maternalSet = new Set(maternalIds);
  for (const person of graph.personById.values()) {
    if (person.branch !== "unknown") continue;
    if (person.generation >= parentGeneration) continue;
    for (const partnershipId of person.partnershipIds) {
      const partnership = graph.partnershipById.get(partnershipId);
      if (!partnership) continue;
      const spouseId =
        partnership.leftPersonId === person.id
          ? partnership.rightPersonId
          : partnership.leftPersonId;
      if (paternalSet.has(spouseId)) {
        paternalIds.push(person.id);
        break;
      }
      if (maternalSet.has(spouseId)) {
        maternalIds.push(person.id);
        break;
      }
    }
  }
  if (paternalIds.length === 0 || maternalIds.length === 0) return;

  // Правый край paternal-половины и левый край maternal-половины на каждом
  // общем Y-bucket'е (та же группировка, что и в detectOverlaps/
  // resolveResidualOverlaps — карточки на радикально разных Y не могут
  // сближаться визуально, сравнивать их незачем).
  const bucketOf = (y: number) => Math.round(y / (GENERATION_GAP / 2));
  const paternalRightEdgeByBucket = new Map<number, number>();
  const maternalLeftEdgeByBucket = new Map<number, number>();

  for (const id of paternalIds) {
    const pos = positionByPerson.get(id);
    if (!pos) continue;
    const bucket = bucketOf(pos.y);
    const edge = pos.x + CARD_WIDTH / 2;
    const current = paternalRightEdgeByBucket.get(bucket);
    if (current === undefined || edge > current)
      paternalRightEdgeByBucket.set(bucket, edge);
  }
  for (const id of maternalIds) {
    const pos = positionByPerson.get(id);
    if (!pos) continue;
    const bucket = bucketOf(pos.y);
    const edge = pos.x - CARD_WIDTH / 2;
    const current = maternalLeftEdgeByBucket.get(bucket);
    if (current === undefined || edge < current)
      maternalLeftEdgeByBucket.set(bucket, edge);
  }

  // Наименьший фактический зазор между половинами среди всех общих bucket'ов
  // — это то, что ограничивает, насколько можно стянуть половины друг к
  // другу, не создав коллизию (§23 — hard constraint важнее компактности,
  // §15 приоритет constraint'ов).
  let minActualGap = Infinity;
  for (const [bucket, paternalEdge] of paternalRightEdgeByBucket) {
    const maternalEdge = maternalLeftEdgeByBucket.get(bucket);
    if (maternalEdge === undefined) continue;
    const gap = maternalEdge - paternalEdge;
    if (gap < minActualGap) minActualGap = gap;
  }
  if (!Number.isFinite(minActualGap)) return;

  const excess = minActualGap - HALF_PLANE_TARGET_GAP;
  if (excess <= 0) return; // уже компактно (или даже теснее цели — не наш случай, т.к. это привело бы к коллизии, но minActualGap уже гарантированно ≥ 0 из placement).

  let shiftEach = excess / 2;

  // Сдвиг НЕ должен занести самого дальнего (ближе к x=0) предка каждой
  // половины ЗА "домашний" x его собственного ребёнка в поколении родителей
  // фокуса (Виктор — paternal, Галина — maternal, не входят в сдвигаемый
  // набор) — иначе дед/бабка визуально оказываются ПРАВЕЕ/ЛЕВЕЕ собственного
  // сына/дочери, что превращает "предки идут ещё дальше в свою сторону"
  // (§7/§8) в противоположное и читается как перепутанная линия (см. историю
  // бага: тест "keeps focus's own parents adjacent..." — Николай Купчик
  // (дед) оказывался x=272, правее Виктора x=16, после нерегулируемого
  // сдвига). Оставляем небольшой запас (CARD_WIDTH) — дед должен быть
  // строго ЛЕВЕЕ (не просто не правее) реального anchor'а внука/внучки.
  const viktorLikeParent = [...graph.personById.values()].find(
    (p) => p.generation === parentGeneration && p.branch === "paternal",
  );
  const galinaLikeParent = [...graph.personById.values()].find(
    (p) => p.generation === parentGeneration && p.branch === "maternal",
  );
  const paternalRightmostEdge = Math.max(...paternalRightEdgeByBucket.values());
  const maternalLeftmostEdge = Math.min(...maternalLeftEdgeByBucket.values());
  if (viktorLikeParent) {
    const anchorX = positionByPerson.get(viktorLikeParent.id)?.x;
    if (anchorX !== undefined) {
      const maxShiftFromParentAnchor =
        anchorX - CARD_WIDTH - paternalRightmostEdge;
      if (shiftEach > maxShiftFromParentAnchor)
        shiftEach = Math.max(0, maxShiftFromParentAnchor);
    }
  }
  if (galinaLikeParent) {
    const anchorX = positionByPerson.get(galinaLikeParent.id)?.x;
    if (anchorX !== undefined) {
      const maxShiftFromParentAnchor =
        maternalLeftmostEdge - (anchorX + CARD_WIDTH);
      if (shiftEach > maxShiftFromParentAnchor)
        shiftEach = Math.max(0, maxShiftFromParentAnchor);
    }
  }
  if (shiftEach <= 0) return;
  for (const id of paternalIds) {
    const pos = positionByPerson.get(id);
    if (pos) pos.x += shiftEach;
  }
  for (const id of maternalIds) {
    const pos = positionByPerson.get(id);
    if (pos) pos.x -= shiftEach;
  }
}

/**
 * Симметрично раздвигает пару "родители Виктора" (paternal) и пару
 * "родители Галины" (maternal) — т.е. ДВУХ супружеских пар в поколении
 * бабушек/дедушек фокуса — если их "домашние" позиции (каждая пара
 * центрирована ровно над своим ребёнком, halfSpan друг от друга) физически
 * пересекаются на общем Y. И у paternal-, и у maternal-пары halfSpan равен
 * (CARD_WIDTH+SPOUSE_GAP)/2 = 104px — тот же, что и между самими Виктором и
 * Галиной (родителями фокуса), поэтому при отсутствии у дедушек/бабушек
 * собственных сиблингов их "внутренние" (ближе к центру) карточки сходятся
 * РОВНО в одной точке x=0 (Елизавета Купчик и Николай Козловский) — реальная
 * коллизия, не мнимая.
 *
 * Раньше это чинилось ТОЧЕЧНЫМ clamp'ом внутри placeAncestorPairUndirected
 * (placement.ts) — сдвигал ТОЛЬКО ОДНУ из двух пар (ту, что раскладывается
 * позже по direction="left"/"right" порядку вызовов), а другая оставалась
 * идеально центрированной над своим ребёнком. Строго корректная (без
 * коллизий) раскладка, но визуально ЯВНАЯ асимметрия: у одних
 * дедушки/бабушки линия к внуку/внучке прямая, у других — с изломом (см.
 * историю бага, product feedback: "отношения равноценные но вот линии
 * почему-то разные", "дерево Виктора и Галины должны быть симметричными").
 *
 * Эта функция вместо этого раздвигает ОБЕ пары ПОРОВНУ — на одинаковую
 * дельту в противоположные стороны от их текущих (each-centered-over-its-
 * own-child) позиций — после чего линия к ребёнку у ОБЕИХ пар отклоняется
 * от вертикали на одинаковый угол (симметрично, а не "одна прямая, другая
 * сломана"). Работает ТОЛЬКО с этой одной парой поколений (родители фокуса
 * и их родители) — более глубокие поколения предков уже обслуживаются
 * compactPaternalMaternalGap (компакция всего, что СТРОГО ВЫШЕ этого
 * уровня) и resolveResidualOverlaps (общий residual sweep); здесь —
 * специализированный частный случай (ровно 2 пары, каждая по 2 человека, на
 * одном Y), для которого общие механизмы дают асимметричный результат.
 */
export function resolveGrandparentSymmetry(
  positionByPerson: Map<string, PlacedPosition>,
  graph: NormalizedGraph,
): void {
  const focusGeneration =
    graph.personById.get(graph.focusPersonId)?.generation ?? 0;
  const parentGeneration = focusGeneration - 1;

  // §7/§8/§10/§11, обобщено на ЛЮБУЮ глубину предков (раньше — только ровно
  // grandparentGeneration = focusGeneration−2, т.е. буквально бабушки/дедушки
  // фокуса). Инвариант "прямая линия родитель→ребёнок" обязателен на КАЖДОМ
  // уровне предков — прабабушки/прадедушки и глубже сталкиваются с той же
  // paternal/maternal-коллизией (две независимо выросшие ветки совпадают по Y
  // и половине), но раньше эта коллизия долетала до resolveResidualOverlaps —
  // общего single-pass sweep'а без cascade к потомкам (см. edges.ts/
  // layout.ts — junction пересчитывается от ФАКТИЧЕСКИХ позиций родителей,
  // но их ребёнок оставался на старом месте) — линия к ребёнку ломалась (см.
  // историю бага: Владимир+Марфа vs Григорий+Елизавета Кривуша, prababушки/
  // прадедушки Александра — resolveResidualOverlaps сдвигал Кривушей вправо,
  // но Елизавета Купчик (их дочь) оставалась на месте, junction съезжал от
  // её X). Идём от caмого глубокого поколения предков ВВЕРХ (потомки уже
  // разрешены раньше — каждый следующий уровень строится на уже
  // скорректированных позициях предыдущего).
  let deepestGeneration = parentGeneration;
  for (const p of graph.personById.values()) {
    if (p.generation < deepestGeneration) deepestGeneration = p.generation;
  }

  for (
    let childGeneration = parentGeneration;
    childGeneration > deepestGeneration;
    childGeneration--
  ) {
    resolveAncestorCoupleCollisionsAtGeneration(
      positionByPerson,
      graph,
      childGeneration,
    );
  }
}

/**
 * Одно поколение предков "childGeneration − 1" — родители всех людей
 * generation===childGeneration — попарно сравниваются на предмет коллизии.
 *
 * Раньше здесь искалась РОВНО одна paternal-персона и РОВНО одна
 * maternal-персона на childGeneration (buквально Виктор/Галина —
 * родители фокуса) — работало только для ПЕРВОГО уровня предков. Глубже
 * (прабабушки/прадедушки и дальше) на одном childGeneration может быть
 * НЕСКОЛЬКО людей с одной и той же branch-меткой (напр. и Николай ст., и
 * Елизавета Купчик — оба "paternal", т.к. branch наследуется от одной и той
 * же стороны Александра, а не от "чей это конкретно родитель") — старый
 * paternal-vs-maternal поиск такую пару вообще не находил, коллизия между
 * их РОДИТЕЛЯМИ (Владимир+Марфа vs Григорий+Елизавета Кривуша) долетала до
 * общего resolveResidualOverlaps без cascade к потомку (см. историю бага).
 *
 * Обобщение: берём КАЖДОГО человека на childGeneration с РОВНО двумя
 * placed-родителями на childGeneration−1, группируем по Y их родительской
 * пары, сортируем группу по X и сравниваем ТОЛЬКО соседние (по X) пары —
 * коллизия физически возможна только между соседями, не через одну.
 */
function resolveAncestorCoupleCollisionsAtGeneration(
  positionByPerson: Map<string, PlacedPosition>,
  graph: NormalizedGraph,
  childGeneration: number,
): void {
  const grandparentGeneration = childGeneration - 1;

  interface Couple {
    childId: string;
    grandparentIds: [string, string];
    y: number;
    leftId: string;
    rightId: string;
  }

  const couples: Couple[] = [];
  for (const person of graph.personById.values()) {
    if (person.generation !== childGeneration) continue;
    const grandparentIds = person.parentIds.filter(
      (id) => graph.personById.get(id)?.generation === grandparentGeneration,
    );
    if (grandparentIds.length !== 2) continue;
    const [aId, bId] = grandparentIds;
    const aPos = positionByPerson.get(aId);
    const bPos = positionByPerson.get(bId);
    if (!aPos || !bPos || aPos.y !== bPos.y) continue;
    const [leftId, rightId] = aPos.x <= bPos.x ? [aId, bId] : [bId, aId];
    couples.push({
      childId: person.id,
      grandparentIds: [aId, bId],
      y: aPos.y,
      leftId,
      rightId,
    });
  }
  if (couples.length < 2) return;

  // Дедупликация по grandparentIds — если у ОДНОЙ пары предков несколько
  // детей на childGeneration (полные сиблинги, напр. Наталья/Светлана/
  // Николай мл./Виктор — все 4 ребёнка Николая ст.+Елизаветы), она попадает
  // в couples 4 раза (по разу на ребёнка) — сравнивать эту пару САМУ С СОБОЙ
  // (соседние в отсортированном списке дети одной и той же родительской
  // четы) бессмысленно (grandparentIds совпадают, actualGap строго
  // отрицательный/нулевой — в лучшем случае no-op, в худшем — лишние
  // itераций). Оставляем ПЕРВОГО встреченного ребёнка на pair — этого
  // достаточно, т.к. hasFullSiblings/паттерн центрирования уже гарантирует,
  // что позиция пары не зависит от того, какой именно ребёнок выбран
  // "представителем".
  const seenGrandparentKey = new Set<string>();
  const dedupedCouples = couples.filter((c) => {
    const key = [...c.grandparentIds].sort().join("|");
    if (seenGrandparentKey.has(key)) return false;
    seenGrandparentKey.add(key);
    return true;
  });
  if (dedupedCouples.length < 2) return;

  const byY = new Map<number, Couple[]>();
  for (const couple of dedupedCouples) {
    if (!byY.has(couple.y)) byY.set(couple.y, []);
    byY.get(couple.y)!.push(couple);
  }

  for (const group of byY.values()) {
    group.sort(
      (a, b) =>
        positionByPerson.get(a.leftId)!.x - positionByPerson.get(b.leftId)!.x,
    );
    for (let i = 0; i < group.length - 1; i++) {
      resolveAdjacentAncestorCouples(
        positionByPerson,
        graph,
        group[i],
        group[i + 1],
      );
    }
  }
}

function resolveAdjacentAncestorCouples(
  positionByPerson: Map<string, PlacedPosition>,
  graph: NormalizedGraph,
  paternal: {
    childId: string;
    grandparentIds: [string, string];
  },
  maternal: {
    childId: string;
    grandparentIds: [string, string];
  },
): void {
  const paternalParent = graph.personById.get(paternal.childId)!;
  const maternalParent = graph.personById.get(maternal.childId)!;
  const paternalGrandparentIds = paternal.grandparentIds;
  const maternalGrandparentIds = maternal.grandparentIds;

  const paternalPositions = paternalGrandparentIds
    .map((id) => positionByPerson.get(id))
    .filter((p) => p !== undefined);
  const maternalPositions = maternalGrandparentIds
    .map((id) => positionByPerson.get(id))
    .filter((p) => p !== undefined);
  if (paternalPositions.length !== 2 || maternalPositions.length !== 2) return;
  if (paternalPositions[0].y !== maternalPositions[0].y) return; // не на одном Y — сравнивать нечего.

  const paternalRightEdge =
    Math.max(...paternalPositions.map((p) => p.x)) + CARD_WIDTH / 2;
  const maternalLeftEdge =
    Math.min(...maternalPositions.map((p) => p.x)) - CARD_WIDTH / 2;
  const actualGap = maternalLeftEdge - paternalRightEdge;
  // Целевой зазор — SIBLING_GAP (§11), не голый MIN_GAP+RESOLUTION_GAP
  // (20px, чисто анти-коллизионный порог): paternal- и maternal-пары —
  // это ДВЕ РАЗНЫЕ семьи (родня Купчиков и родня Козловских), а не
  // сиблинги внутри одной — они должны читаться как визуально ОТДЕЛЬНЫЕ
  // группы, с тем же зазором, что и между родными сиблингами (Александр↔
  // Дарья, §11 "между семьями должно быть такое же расстояние, как между
  // сиблингами"), а не просто "не накладываются" (см. историю бага:
  // Елизавета Купчик/Николай Козловский сходились на 48px — едва больше
  // MIN_GAP+RESOLUTION_GAP — вместо 64px=SIBLING_GAP).
  const deficit = SIBLING_GAP - actualGap;

  // §7/§8 — деды/бабки ДОЛЖНЫ оставаться на своей стороне относительно
  // СОБСТВЕННОГО ребёнка (Виктор/Галина): даже "внутренний" (ближе к
  // центру) член пары не может пересечь x своего ребёнка — иначе paternal-
  // предок оказывается правее (не левее) Виктора, что противоречит §7/§8
  // (см. историю бага: наивный deficit/2 давал shiftEach=98, недостаточно,
  // чтобы Николай Козловский (0+98=98) остался правее Галины (104)).
  //
  // ЭТА проверка НЕ зависит от deficit (зазора между парами) и считается
  // ВСЕГДА, даже когда деды/бабки уже далеко друг от друга по SIBLING_GAP
  // (deficit<=0) — иначе она пропускалась целиком: когда одна половина
  // сильно шире другой (напр. у Виктора появились сиблинги — Николай мл.,
  // Светлана, Наталья — их sibling-row утягивает paternal-пару далеко
  // влево, actualGap между парами становится огромным САМ ПО СЕБЕ), ранний
  // return "уже достаточный зазор" срабатывал ДО того, как проверялся
  // own-child bound — Николай Козловский оставался на своей "домашней"
  // позиции (centered husband-left от Галины), которая сама по себе левее
  // Галины (муж всегда слева от жены, §9), но это уже пересечение с §7/§8:
  // maternal-дед не может быть левее СВОЕГО РЕБЁНКА (Галины) — см. историю
  // бага: Николай Козловский x=-68 оказывался левее Галины x=36.
  const paternalInnerX = Math.max(...paternalPositions.map((p) => p.x)); // ближе к центру = правее у paternal-пары
  const maternalInnerX = Math.min(...maternalPositions.map((p) => p.x)); // ближе к центру = левее у maternal-пары
  const paternalOwnChildX =
    positionByPerson.get(paternalParent.id)?.x ?? paternalInnerX;
  const maternalOwnChildX =
    positionByPerson.get(maternalParent.id)?.x ?? maternalInnerX;
  const minShiftForOwnChildBound = Math.max(
    0,
    paternalInnerX - paternalOwnChildX + MIN_GAP, // paternal inner must end up ≤ paternalOwnChildX
    maternalOwnChildX - maternalInnerX + MIN_GAP, // maternal inner must end up ≥ maternalOwnChildX
  );

  if (deficit <= 0 && minShiftForOwnChildBound <= 0) return; // уже достаточный зазор И обе пары на своей стороне — ничего не трогаем.

  // §9 — если paternalParent и maternalParent САМИ являются супругами друг
  // друга (не просто "два разных couple'а на одном Y", а буквально ОДНА
  // пара — напр. Николай ст.+Елизавета Купчик), их взаимный зазор ФИКСИРОВАН
  // (SPOUSE_GAP, §9 "супруги всегда рядом") и НЕ подлежит растяжению даже
  // ради разведения их родителей (product decision: "верни расстояние между
  // Николаем и Елизаветой" — раздвигать саму пару ЗАПРЕЩЕНО). Сдвигаем ТОЛЬКО
  // grandparent-пары, никогда paternalParent/maternalParent самих.
  //
  // НО: §10 "родители должны быть отцентрированы над ИХ детьми" — если у
  // grandparent-пары ЕСТЬ ещё дети, кроме paternalParent/maternalParent
  // (напр. Владимир+Марфа — родители не только Николая ст., но и его
  // сиблингов Михаила/Веры), эта пара УЖЕ жёстко центрирована над ВСЕМ своим
  // рядом детей — сдвигать её без сдвига всего ряда сломало бы центрировку
  // (product decision: "центрируй родителей строго над их детьми, и
  // запомни это"), а сдвигать весь ряд запрещено предыдущим правилом (это
  // сдвинуло бы paternalParent относительно его супруга). Значит эта пара
  // "pinned" — как и в НЕ-supружеской ветке ниже (hasFullSiblings), сдвигать
  // нужно ТОЛЬКО непиненную сторону, на полную величину.
  if (arePartners(graph, paternalParent.id, maternalParent.id)) {
    const paternalPinnedBySiblings = hasFullSiblings(graph, paternalParent.id);
    const maternalPinnedBySiblings = hasFullSiblings(graph, maternalParent.id);
    if (paternalPinnedBySiblings && maternalPinnedBySiblings) {
      // Обе стороны пинены собственными sibling-row'ами — сдвигать некого
      // без поломки §10 у одной из них. Оставляем как есть (residual sweep
      // поймает реальную коллизию, если она физически осталась).
      return;
    }
    const shiftEachForKink = Math.max(deficit / 2, minShiftForOwnChildBound);
    if (!paternalPinnedBySiblings && !maternalPinnedBySiblings) {
      for (const id of paternalGrandparentIds) {
        const pos = positionByPerson.get(id);
        if (pos) pos.x -= shiftEachForKink;
      }
      for (const id of maternalGrandparentIds) {
        const pos = positionByPerson.get(id);
        if (pos) pos.x += shiftEachForKink;
      }
    } else if (!paternalPinnedBySiblings) {
      for (const id of paternalGrandparentIds) {
        const pos = positionByPerson.get(id);
        if (pos) pos.x -= shiftEachForKink * 2;
      }
    } else {
      for (const id of maternalGrandparentIds) {
        const pos = positionByPerson.get(id);
        if (pos) pos.x += shiftEachForKink * 2;
      }
    }
    return;
  }

  // §10 — родители (Николай ст.+Елизавета и т.п.) ДОЛЖНЫ оставаться
  // отцентрированы над своими детьми (полным sibling-row'ом — Наталья/
  // Светлана/Николай мл./Виктор, а не только над одним ребёнком) — это
  // жёсткое требование, которое симметричный сдвиг ОБЕИХ пар может
  // сломать, если сдвигаться нужно только ОДНОЙ стороне.
  //
  // Симметричный сдвиг (раньше — безусловно ОБЕИХ пар на shiftEach)
  // оправдан ТОЛЬКО когда КАЖДАЯ пара сама по себе стоит "дома"
  // (центрирована над СВОИМ рядом детей, никем не сдвинута заранее) —
  // тогда коллизия строго симметрична (обе пары одинаково стремятся друг к
  // другу от x=0), и её разрешение поровну не портит ничью центровку (см.
  // историю бага и product feedback: "отношения равноценные, линии не
  // должны быть разными" — Виктор/Галина ДОЛЖНЫ читаться одинаково). Но
  // когда деды/бабки уже смещены СВОИМИ сиблингами (напр. paternal-пара —
  // Николай ст.+Елизавета — уже стоит ровно над своими 4 детьми, включая
  // Наталью/Светлану/Николая мл., см. §11), они узнаваемо "дома" и сдвигать
  // их дальше НЕЛЬЗЯ — нарушение (own-child bound ИЛИ недостаточный зазор)
  // целиком принадлежит ДРУГОЙ стороне (Николай Козловский/Надежда), и
  // сдвигать нужно ТОЛЬКО её (см. историю бага: Николай ст.+Елизавета
  // съезжали с точного центра над своими 4 детьми на 112px влево, хотя их
  // сторона была абсолютно корректна сама по себе).
  // "У родителя есть полные сиблинги" ⇒ его дед/бабка (paternal/maternal
  // grandparentIds) УЖЕ жёстко центрированы над РЯДОМ из нескольких детей
  // (не только над одним) — эта позиция "пинится" §10 и НЕ должна сдвигаться
  // здесь. Если сиблингов нет — дед/бабка стоят "дома" (просто centered над
  // единственным ребёнком, halfSpan) и МОГУТ подвинуться без потери
  // какого-либо centering-инварианта.
  const paternalPinned = hasFullSiblings(graph, paternalParent.id);
  const maternalPinned = hasFullSiblings(graph, maternalParent.id);
  const shiftEach = Math.max(deficit / 2, minShiftForOwnChildBound);
  // Обе стороны "дома" (никто не запинен) — прежний симметричный сдвиг
  // ОБЕИХ пар поровну (§ product feedback: "отношения равноценные, линии не
  // должны быть разными"). Ровно одна сторона запинена — сдвигаем ТОЛЬКО
  // незапиненную на ПОЛНУЮ величину (2×shiftEach: она одна закрывает весь
  // дефицит/own-child bound, которые раньше делились пополам между двумя
  // сторонами, см. историю бага выше). Обе запинены (редкий случай — обе
  // стороны centering-важные) — сдвигать некого без поломки §10 обеим,
  // оставляем как есть (assertNoOverlaps в layout.ts поймает реальную
  // коллизию, если она есть).
  //
  // §ЛИНИЯ-НА-КАЖДОМ-УРОВНЕ: сдвинуть саму пару НЕДОСТАТОЧНО — её ребёнок
  // (paternalParent/maternalParent) должен сдвинуться НА ТУ ЖЕ дельту, иначе
  // junction (пересчитывается в layout.ts от фактических X родителей) съедет
  // от X ребёнка и линия сломается (см. историю бага выше). Сдвигаем ВМЕСТЕ
  // с парой весь уже размещённый "подвешенный" на ней блок — сам ребёнок,
  // его супруг(а) (если есть) и вся его sibling-row (если есть, §11) — т.е.
  // ВСЁ, что placeAncestorFork/placeFixedAnchorSiblingRow уже поставили
  // относительно этого ребёнка на его собственном Y, включая всё, что ниже
  // (потомки этого Y уже центрированы относительно родителя своей branch'и
  // на предыдущих итерациях этого же цикла/passes — двигаем их ЦЕЛИКОМ как
  // жёсткий блок, не пересчитывая внутреннюю геометрию).
  // stopId — граница BFS в cascadeShift: paternalParent и maternalParent
  // МОГУТ сами оказаться супругами друг друга (напр. Николай ст.+Елизавета
  // Купчик — ИМЕННО такая пара, а не просто "два разных couple'а на одном
  // Y") — без границы cascadeShift(paternalParent, −shiftEach) перепрыгивал
  // бы ЧЕРЕЗ супружескую связь на maternalParent и сдвигал его тоже, а
  // следом cascadeShift(maternalParent, +shiftEach) сдвигал бы его ЕЩЁ РАЗ
  // в обратную сторону — суммарно ноль, оба ребёнка оставались на месте, и
  // junction продолжал съезжать от их X (см. историю бага: Николай
  // ст./Елизавета Купчик не двигались вовсе, хотя их родители — Владимир+
  // Марфа/Григорий+Елизавета Кривуша — уже разъехались).
  if (!paternalPinned && !maternalPinned) {
    cascadeShift(
      positionByPerson,
      graph,
      paternalParent.id,
      -shiftEach,
      maternalParent.id,
    );
    for (const id of paternalGrandparentIds) {
      const pos = positionByPerson.get(id);
      if (pos) pos.x -= shiftEach;
    }
    cascadeShift(
      positionByPerson,
      graph,
      maternalParent.id,
      shiftEach,
      paternalParent.id,
    );
    for (const id of maternalGrandparentIds) {
      const pos = positionByPerson.get(id);
      if (pos) pos.x += shiftEach;
    }
  } else if (!paternalPinned) {
    cascadeShift(
      positionByPerson,
      graph,
      paternalParent.id,
      -shiftEach * 2,
      maternalParent.id,
    );
    for (const id of paternalGrandparentIds) {
      const pos = positionByPerson.get(id);
      if (pos) pos.x -= shiftEach * 2;
    }
  } else if (!maternalPinned) {
    cascadeShift(
      positionByPerson,
      graph,
      maternalParent.id,
      shiftEach * 2,
      paternalParent.id,
    );
    for (const id of maternalGrandparentIds) {
      const pos = positionByPerson.get(id);
      if (pos) pos.x += shiftEach * 2;
    }
  }
}

/**
 * Жёстко (rigid — вся внутренняя геометрия сохраняется 1:1) сдвигает на
 * `delta` весь блок, "подвешенный" на persionId со стороны фокуса: самого
 * personId, его супруга(ов) (partnershipIds) и ВСЕХ его потомков, уже
 * размещённых в positionByPerson (рекурсивно через children реальных
 * relationships, а не measure-oriented branchesOf — нужны именно уже
 * РАЗМЕЩЁННЫЕ карточки, а не теоретическая структура). Не трогает предков
 * personId (родителей и выше) — та сторона уже сдвинута отдельно вызывающим
 * кодом (resolveAncestorCoupleCollisionsAtGeneration сдвигает пару предков
 * сама).
 *
 * Обходит personId "вниз" через childrenIds его partnership'ов/solo-записей
 * — то же направление, что и placement.ts (§17 — одна карточка на
 * человека), но здесь работаем от уже посчитанного graph, а не строим
 * заново: собираем reverse-map parentId→childrenIds один раз на вызов
 * (дёшево — размер графа тот же порядок, что и сам layout, §42 — n² уже
 * приемлем в этом файле).
 */
function cascadeShift(
  positionByPerson: Map<string, PlacedPosition>,
  graph: NormalizedGraph,
  personId: string,
  delta: number,
  /**
   * Граница обхода — id, который BFS не смеет ПОСЕТИТЬ (и, значит, не может
   * уйти дальше через него). Нужен, когда caller сдвигает ДВЕ стороны ОДНОЙ
   * супружеской пары раздельными вызовами (напр. paternalParent и
   * maternalParent сами женаты друг на друге) — без stopId первый вызов
   * перепрыгивал бы через spouse-связь на вторую сторону и сдвигал бы её
   * тоже, а второй вызов сдвигал бы ЕЁ ЖЕ ещё раз в обратную сторону,
   * суммарно взаимно гася оба сдвига (см. историю бага: Николай ст./
   * Елизавета Купчик оставались на месте, хотя их родители разъехались).
   */
  stopId?: string,
): void {
  if (delta === 0) return;

  const childrenIdsByParent = new Map<string, string[]>();
  for (const person of graph.personById.values()) {
    for (const parentId of person.parentIds) {
      if (!childrenIdsByParent.has(parentId))
        childrenIdsByParent.set(parentId, []);
      childrenIdsByParent.get(parentId)!.push(person.id);
    }
  }

  // §7/§8/§9/§10 — эта BFS обходит СВОЮ РОДНУЮ линию потомков personId'а,
  // а НЕ произвольно расширяется на всё, что случайно достижимо через
  // supruzheskie связи потомков. Правило, которого не было раньше (см.
  // историю бага: Николай Козловский обзавёлся родителями (Василий+
  // Елизавета), их сдвиг каскадом дошёл до Галины (его дочь, ожидаемо) →
  // ЧЕРЕЗ супружескую связь до её мужа Виктора Купчика (сам корень
  // СОВЕРШЕННО другой семьи — свои родители Николай ст.+Елизавета, 3
  // родных сиблинга); первая попытка (никогда не пересекать супружескую
  // связь потомка) чинила это, но ломала §9 в обратную сторону — Виктор с
  // Галиной, САМИ РОДИТЕЛИ ФОКУСА, разъезжались на сотни px, product
  // decision: "супруги должны быть всегда вместе" — этого допускать нельзя):
  //
  // Ребёнок с ДВУМЯ родителями в графе добавляется в BFS, только когда ОБА
  // его родителя уже сдвинуты (посещены) этим же вызовом — иначе он
  // "разрывается" между сдвинутым и несдвинутым родителем, теряя §10
  // центрирование между ними (см. историю с Александром: сдвигался через
  // Галину одну, хотя его второй родитель Виктор не двигался). У ребёнка с
  // ОДНИМ known-родителем (SoloParent) это ограничение не применяется —
  // сдвигается сразу. Раз оба родителя ребёнка уже в сдвиге — сам ребёнок
  // считается "полноправным" членом этой сдвигаемой семьи (как и корень
  // personId), и его СОБСТВЕННАЯ супружеская связь ТОЖЕ пересекается — это
  // и есть путь, которым Виктор (муж Галины — она "полноправна", т.к. оба
  // её родителя, Николай Козловский+Надежда, сдвинуты) корректно попадает
  // в сдвиг и остаётся рядом с женой, вместо того чтобы либо отрываться от
  // нее, либо тащить за собой чужой, несвязанный sibling-row.
  // "Полноправный" узел — корень personId, или ребёнок, чьи ОБА родителя уже
  // в этом же сдвиге (см. bothParentsShifted ниже). Только у полноправных
  // узлов пересекается их СОБСТВЕННАЯ супружеская связь — супруг, встреченный
  // ТОЛЬКО через одного из двух родителей "неполноправного" узла (напр.
  // Виктор Купчик — муж Галины, но сам целиком принадлежит ДРУГОЙ, никак не
  // связанной с этим сдвигом семье), не тащится за собой (см. историю бага
  // выше). Но если оба родителя ребёнка сдвинуты — сам ребёнок уже реально
  // "внутри" этой сдвигаемой семьи (в отличие от Александра, чей ОДИН
  // родитель Виктор так и не сдвинулся) — и ЕГО супруг(а) должна остаться
  // рядом с ним (§9), поэтому пересекается тоже.
  const legitimate = new Set<string>([personId]);
  const visited = new Set<string>();
  const queue = [personId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (id === stopId) continue;
    if (visited.has(id)) continue;
    visited.add(id);

    const pos = positionByPerson.get(id);
    if (pos) pos.x += delta;

    if (legitimate.has(id)) {
      const person = graph.personById.get(id);
      for (const partnershipId of person?.partnershipIds ?? []) {
        const partnership = graph.partnershipById.get(partnershipId);
        if (!partnership) continue;
        const spouseId =
          partnership.leftPersonId === id
            ? partnership.rightPersonId
            : partnership.leftPersonId;
        queue.push(spouseId);
        // Супруг ПОЛНОПРАВНОГО узла, встреченный ЧЕРЕЗ супружескую связь
        // (а не как ребёнок с обоими сдвинутыми родителями), сам не
        // "полноправен" по умолчанию — но его РОДНЫЕ СИБЛИНГИ (product
        // decision: "родные братья и сестры должны располагаться рядом")
        // должны сдвигаться ВМЕСТЕ с ним, иначе он отрывается от
        // собственного sibling-row'а (см. историю бага: Виктор Купчик
        // сдвигался вместе с женой Галиной, чьи родители получили новых
        // предков, но его родные сиблинги — Наталья/Светлана/Николай мл. —
        // оставались на месте, ломая §10-центрирование ИХ родителей
        // Николая ст.+Елизаветы над всеми 4 детьми). Добавляем этих
        // сиблингов в очередь напрямую (не как "детей spouseId'а" — они
        // сиблинги, не дети) — они сами становятся полноправными узлами
        // (их родители не относятся к этому сдвигу вообще, так что для НИХ
        // "оба родителя сдвинуты" неприменимо — но раз сам spouseId уже
        // сдвигается как единое целое со своей второй половиной, его родные
        // сиблинги идут вместе с ним по тому же принципу "не отрываться от
        // своей родной линии").
        const spouse = graph.personById.get(spouseId);
        if (spouse && spouse.parentIds.length === 2) {
          const [parentAId, parentBId] = spouse.parentIds;
          for (const siblingId of childrenIdsByParent.get(parentAId) ?? []) {
            if (siblingId === spouseId) continue;
            const sibling = graph.personById.get(siblingId);
            const sameParents =
              sibling?.parentIds.length === 2 &&
              sibling.parentIds.includes(parentAId) &&
              sibling.parentIds.includes(parentBId);
            if (sameParents) {
              legitimate.add(siblingId);
              queue.push(siblingId);
            }
          }
        }
      }
    }
    for (const childId of childrenIdsByParent.get(id) ?? []) {
      const child = graph.personById.get(childId);
      const bothParentsShifted =
        !child ||
        child.parentIds.length !== 2 ||
        child.parentIds.every((pid) => visited.has(pid));
      if (bothParentsShifted) {
        legitimate.add(childId);
        queue.push(childId);
      }
    }
  }
}

/** true, если aId и bId состоят в ОБЩЕМ partnership друг с другом (женаты/в паре) — используется, чтобы отличить "две разные независимые ветки предков, совпавшие по Y" (свободно двигаются в разные стороны) от "paternalParent и maternalParent — буквально одна и та же супружеская пара" (их взаимный зазор фиксирован §9, двигать нельзя, см. resolveAdjacentAncestorCouples). */
function arePartners(
  graph: NormalizedGraph,
  aId: string,
  bId: string,
): boolean {
  const a = graph.personById.get(aId);
  for (const partnershipId of a?.partnershipIds ?? []) {
    const partnership = graph.partnershipById.get(partnershipId);
    if (!partnership) continue;
    if (
      (partnership.leftPersonId === aId && partnership.rightPersonId === bId) ||
      (partnership.leftPersonId === bId && partnership.rightPersonId === aId)
    ) {
      return true;
    }
  }
  return false;
}

/** true, если personId — один из НЕСКОЛЬКИХ детей от ОДНОЙ И ТОЙ ЖЕ родительской пары (т.е. у него есть хотя бы один полный сиблинг, §11) — ищет общий Partnership его родителей и проверяет childrenIds.length > 1. Один родитель или нет общего Partnership (SoloParent-случай) ⇒ false (эта функция не заглядывает в SoloParent — родительская пара без зафиксированного брака здесь не встречается для реальных grandparent-кейсов). */
function hasFullSiblings(graph: NormalizedGraph, personId: string): boolean {
  const person = graph.personById.get(personId);
  if (!person || person.parentIds.length !== 2) return false;
  const [aId, bId] = person.parentIds;
  const a = graph.personById.get(aId);
  for (const partnershipId of a?.partnershipIds ?? []) {
    const partnership = graph.partnershipById.get(partnershipId);
    if (!partnership) continue;
    const members = new Set([
      partnership.leftPersonId,
      partnership.rightPersonId,
    ]);
    if (members.has(aId) && members.has(bId)) {
      return partnership.childrenIds.length > 1;
    }
  }
  return false;
}

/**
 * §25 — разрешение ОСТАТОЧНЫХ коллизий (после measure-then-place, который
 * по построению исключает коллизии ВНУТРИ одного family-обхода — §12, но не
 * между двумя независимыми обходами, ничего не знающими друг о друге —
 * напр. двоюродные линии через разных прародителей, или супруг, пристроенный
 * к далеко раздвинутой chained-веткой карточке) — детерминированный
 * left-to-right sweep, а НЕ попарный push-until-clear (который каскадно
 * заезжает то в одну, то в другую уже раздвинутую карточку и может создавать
 * новые коллизии, см. историю бага).
 *
 * Группирует карточки по тому же Y-bucket'у, что и detectOverlaps, сортирует
 * каждую группу по X и проходит СЛЕВА НАПРАВО ОДИН РАЗ, требуя минимальный
 * зазор (CARD_WIDTH+RESOLUTION_GAP между центрами) от предыдущей уже
 * зафиксированной карточки — если раздвигаемая карточка состоит в
 * partnership с кем-то ещё в ТОЙ ЖЕ группе, супруг сдвигается на ту же
 * дельту (сохраняя их взаимный SPOUSE_GAP, а не растягивая пару, §16).
 * Один проход достаточен: после сортировки по X каждая карточка сравнивается
 * только с уже "закреплённой" левой соседкой, так что сдвиг вправо никогда
 * не может заново создать коллизию слева.
 */
export function resolveResidualOverlaps(
  positionByPerson: Map<string, PlacedPosition>,
  graph: NormalizedGraph,
): void {
  void graph; // намеренно НЕ используется — см. комментарий ниже про spouse-linking.

  const bucketOf = (y: number) => Math.round(y / (GENERATION_GAP / 2));
  const groupsByBucket = new Map<number, string[]>();
  for (const [id, pos] of positionByPerson) {
    const bucket = bucketOf(pos.y);
    if (!groupsByBucket.has(bucket)) groupsByBucket.set(bucket, []);
    groupsByBucket.get(bucket)!.push(id);
  }

  const requiredGap = CARD_WIDTH + RESOLUTION_GAP;

  // Простой ОДНОПРОХОДНЫЙ left-to-right sweep, БЕЗ spouse-linking: каждая
  // карточка сравнивается только с уже "закреплённой" левой соседкой и
  // сдвигается вправо при необходимости — после сортировки по X это гарантия
  // (не эвристика) нулевых коллизий за один проход, т.к. сдвиг вправо только
  // увеличивает зазор со всем, что уже левее.
  //
  // Ранее здесь была spouse-aware версия (сдвигающая супруга на ту же
  // дельту, чтобы пара "не растягивалась", §16) — она порождала два разных
  // класса регрессий: (1) если raздвигаемая пара САМА была married-couple,
  // спутник (являющийся previousId) сдвигался на ту же дельту, что и
  // партнёр, просто ВОССТАНАВЛИВАЯ исходный слишком маленький зазор между
  // ними — Михаил+Марина Купчик оставались слишком близко сколько угодно
  // итераций; (2) сдвиг супруга, стоящего ДАЛЬШЕ в sorted-порядке, мог
  // ПРИБЛИЗИТЬ его к его же собственному правому соседу и создать НОВУЮ
  // коллизию несколькими шагами дальше по цепочке (Вера Купчик/Елена Ушкар —
  // взаимный зазор оставался искусственно маленьким через десятки итераций
  // многопроходного sweep'а, т.к. супруг Елены — Николай Ушкар — каждый раз
  // "тянул" её обратно). Простой single-pass без spouse-linking МЕНЕЕ
  // визуально аккуратен (супруг может НЕЗНАЧИТЕЛЬНО, редко, разъехаться со
  // своей парой в этом fallback-пути) — но корректность (§23 — жёсткое "нет
  // коллизий") важнее эстетики в этом редком residual-случае (см. финальный
  // отчёт, Known limitations).
  for (const ids of groupsByBucket.values()) {
    const sorted = [...ids].sort(
      (a, b) => positionByPerson.get(a)!.x - positionByPerson.get(b)!.x,
    );
    let previousId: string | null = null;
    for (const id of sorted) {
      if (previousId === null) {
        previousId = id;
        continue;
      }
      const pos = positionByPerson.get(id)!;
      const prevPos = positionByPerson.get(previousId)!;
      const minX = prevPos.x + requiredGap;
      if (pos.x < minX) pos.x = minX;
      previousId = id;
    }
  }
}

/**
 * §23 — финальная проверка постфактум: бросает, если после
 * resolveResidualOverlaps (уже применённого в layout.ts) остались
 * коллизии — не должно происходить на практике (guard-лимит в
 * resolveResidualOverlaps достаточен для масштаба реальных данных, §42), но
 * явный throw здесь превращает "молча неправильный layout" в громкую ошибку
 * теста, а не тихий визуальный баг.
 */
export function assertNoOverlaps(
  positionByPerson: Map<string, PlacedPosition>,
  graph: NormalizedGraph,
): void {
  void graph;
  const overlaps = detectOverlaps(positionByPerson);
  if (overlaps.length > 0) {
    const summary = overlaps
      .slice(0, 5)
      .map((o) => `${o.personAId} × ${o.personBId}`)
      .join(", ");
    throw new Error(
      `tree-v3 layout produced ${overlaps.length} overlap(s): ${summary}${overlaps.length > 5 ? ", …" : ""}`,
    );
  }
}
