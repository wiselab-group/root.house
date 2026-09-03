import type { NormalizedGraph } from "./types";
import { CARD_WIDTH } from "./subtree";
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
  const focusGeneration = graph.personById.get(graph.focusPersonId)?.generation ?? 0;
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
        partnership.leftPersonId === person.id ? partnership.rightPersonId : partnership.leftPersonId;
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
    if (current === undefined || edge > current) paternalRightEdgeByBucket.set(bucket, edge);
  }
  for (const id of maternalIds) {
    const pos = positionByPerson.get(id);
    if (!pos) continue;
    const bucket = bucketOf(pos.y);
    const edge = pos.x - CARD_WIDTH / 2;
    const current = maternalLeftEdgeByBucket.get(bucket);
    if (current === undefined || edge < current) maternalLeftEdgeByBucket.set(bucket, edge);
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
      const maxShiftFromParentAnchor = anchorX - CARD_WIDTH - paternalRightmostEdge;
      if (shiftEach > maxShiftFromParentAnchor) shiftEach = Math.max(0, maxShiftFromParentAnchor);
    }
  }
  if (galinaLikeParent) {
    const anchorX = positionByPerson.get(galinaLikeParent.id)?.x;
    if (anchorX !== undefined) {
      const maxShiftFromParentAnchor = maternalLeftmostEdge - (anchorX + CARD_WIDTH);
      if (shiftEach > maxShiftFromParentAnchor) shiftEach = Math.max(0, maxShiftFromParentAnchor);
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
    const sorted = [...ids].sort((a, b) => positionByPerson.get(a)!.x - positionByPerson.get(b)!.x);
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
