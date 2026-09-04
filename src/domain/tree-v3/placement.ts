import type { NormalizedGraph } from "./types";
import {
  CARD_WIDTH,
  REMARRIAGE_GAP,
  SIBLING_GAP,
  SPOUSE_GAP,
  branchesOf,
  measurePersonDescendantWidth,
  type Branch,
} from "./subtree";

/** Вертикальный шаг между поколениями (soft — §14: базовый интервал; конкретный y узла может быть скорректирован локально при разрешении коллизий). */
export const GENERATION_GAP = 240;

export interface PlacedPosition {
  x: number;
  y: number;
}

export interface PlacementResult {
  positionByPerson: Map<string, PlacedPosition>;
  /** Junction-точка каждого partnership (T-образная линия к детям) — см. edges.ts. */
  junctionByPartnership: Map<string, PlacedPosition>;
}

/**
 * tree-v3 — измерь-потом-размести (§45: subtree measurement ДО placement).
 * В отличие от tree-v2/layout.ts (place → detect collision → push,
 * рекурсивно, с занятыми диапазонами по generation — источник реальных
 * регрессий, см. анализ в начале задачи), здесь каждая ветка получает СВОЙ
 * зарезервированный слот ещё до того, как в него кладётся первый узел:
 * коллизии между независимо измеренными ветками одного родителя невозможны
 * по построению.
 *
 * Модель — РОВНО одна карточка на человека (§17), даже при нескольких
 * партнёрствах (§19/§20): каждое partnership человека — отдельная
 * под-ветка со своим junction и своими детьми, расходящаяся от одной и той
 * же его карточки (см. subtree.ts Branch).
 *
 * Paternal/maternal (§7/§8) — ЯВНЫЙ half-plane split: от фокуса поднимаясь
 * к родителям, отцовская ветвь (со всеми её предками и "дядями/тётями") и
 * материнская ветвь размещаются в ДВУХ независимо зарезервированных
 * горизонтальных budget'ах — paternal строго left of x=0, maternal строго
 * right of x=0 — а не оставляются "структурным следствием" обхода (это не
 * гарантирует направление само по себе, только раздельность).
 */
export function placeGraph(graph: NormalizedGraph): PlacementResult {
  const positionByPerson = new Map<string, PlacedPosition>();
  const junctionByPartnership = new Map<string, PlacedPosition>();
  const placedPersons = new Set<string>();
  // Дальний край уже занятой территории на (y, side) — ключ `${y}|left`/
  // `${y}|right`. Каждый independently-placed ancestor-row (Марфа+Кривуша —
  // РАЗНЫЕ вызовы placeAncestorFork на одном Y и одной стороне, не связанные
  // друг с другом в рамках ОДНОГО placeAncestorPairUndirected, где работает
  // "chained"-параметр) сверяется с этим перед стартом и обновляет его после
  // — без этого две независимые ветки предков на одной стороне (paternal
  // ИЛИ maternal) могут столкнуться, если каждая знает только про СВОЙ
  // прямой родительский подъём, но не про параллельный подъём от СОСЕДНЕЙ
  // ветки того же дерева (см. историю бага: Марфа Купчик (родители Николая
  // Купчика) и Григорий Кривуша (родители Елизаветы Купчик) — обе paternal
  // half-plane, но из РАЗНЫХ, не связанных друг с другом вызовов
  // placeAncestorFork). Единственный "safety net" уровня §25 в этой
  // реализации — remaining архитектурная граница measure-then-place
  // подхода задокументирована как known limitation в финальном отчёте.
  const occupiedEdgeBySide = new Map<string, number>();
  // Partnership id'ы, для которых placeBranch УЖЕ отработал (карточки +
  // junction + дети) — предотвращает бесконечную взаимную рекурсию
  // A→placeDescendantBranches(B)→[та же партнёрка a-b]→placeBranch→
  // placeDescendantBranches(A)→[снова a-b]→... (см. §19 многобрачие: супруг
  // тоже может иметь СВОИ branches, которые нужно посетить — но каждую
  // партнёрку только один раз).
  const visitedPartnerships = new Set<string>();

  // 1) Фокус-персона — потомки размещаются вниз через ВСЕ её
  // партнёрства/solo-ветки (§19: ремарьяж отражается по обеим сторонам),
  // используя x=0 только как СИД для branch-центрирования — если у фокуса
  // есть партнёр, сама персона НЕ обязательно окажется РОВНО на x=0 после
  // этого шага (partnership centering кладёт её на branchCenterX∓halfSpan,
  // не на personX впрямую). Поэтому x=0 не форсируется здесь через
  // setPosition заранее (это создавало бы конфликт "первая запись
  // побеждает" с последующей branch-центрированной позицией — см. историю
  // бага: focus и супруг(а) физически накладывались друг на друга, т.к.
  // focus оставался жёстко приколот к 0, а супруг(а) вычислялся(-ась)
  // относительно уже смещённого branchCenterX).
  placeDescendantBranches(graph.focusPersonId, 0, 0);
  // Фокус без партнёрств и без детей: placeDescendantBranches выше ничего
  // не разместила (нет branches) — фолбэк на явный x=0 seed.
  setPosition(graph.focusPersonId, 0, 0);

  // 2) Предки фокуса — вверх, papa-side влево, mama-side вправо (§7/§8/§9).
  placeAncestorFork(
    graph.focusPersonId,
    positionByPerson.get(graph.focusPersonId)!.x,
    0,
    "free",
  );

  // 3) Нормализация: сдвигаем ВСЮ раскладку так, чтобы фокус оказался ровно
  // на x=0 (§6/§28 — это жёсткое требование, но достигается пост-фактум
  // сдвигом, а не приколачиванием до вычисления branch-геометрии).
  const focusPos = positionByPerson.get(graph.focusPersonId)!;
  if (focusPos.x !== 0) {
    const shiftX = -focusPos.x;
    for (const pos of positionByPerson.values()) pos.x += shiftX;
    for (const junction of junctionByPartnership.values()) junction.x += shiftX;
  }

  // 4) Junction-точки partnership'ов пересчитываются от ФАКТИЧЕСКИХ финальных
  // позиций обоих партнёров (простая середина) — а не доверяются
  // промежуточному junctionX, вычисленному в процессе размещения. Разные
  // пути обхода (symmetric vs asymmetric branch, chained ancestor rows,
  // clamp против occupiedEdge и т.д.) двигают партнёров ПОСЛЕ того, как их
  // изначальный junctionX был вычислен, и он может разойтись с их реальным
  // серединным положением (см. историю бага: Николай+Елена Ушкар получали
  // junction, вычисленный ДО того, как Елена была фактически отодвинута
  // occupied-edge clamp'ом на своей half-plane — дети вставали у junction,
  // географически далёкого от обоих родителей).
  for (const [partnershipId, partnership] of graph.partnershipById) {
    const leftPos = positionByPerson.get(partnership.leftPersonId);
    const rightPos = positionByPerson.get(partnership.rightPersonId);
    if (!leftPos || !rightPos) continue;
    junctionByPartnership.set(partnershipId, {
      x: (leftPos.x + rightPos.x) / 2,
      y: leftPos.y,
    });
  }

  return { positionByPerson, junctionByPartnership };

  // -------------------------------------------------------------------------

  function setPosition(personId: string, x: number, y: number): void {
    // §17: один Person — один узел. Повторное достижение (напр. оба супруга
    // кровные родственники друг друга) не телепортирует уже размещённого.
    if (placedPersons.has(personId)) return;
    placedPersons.add(personId);
    positionByPerson.set(personId, { x, y });
  }

  /** Дальний уже занятый край на (y, side) — Infinity/-Infinity (никогда не ограничивает), если сторона ещё не занята. */
  function occupiedEdge(y: number, side: "left" | "right"): number {
    const key = `${y}|${side}`;
    const value = occupiedEdgeBySide.get(key);
    if (value !== undefined) return value;
    return side === "left" ? Infinity : -Infinity;
  }

  /** Расширяет занятую территорию на (y, side) до нового края, если он дальше уже зафиксированного (§25 — safety net против независимых веток на одной стороне, не связанных общим caller'ом). */
  function extendOccupiedEdge(
    y: number,
    side: "left" | "right",
    edgeX: number,
  ): void {
    const key = `${y}|${side}`;
    const current = occupiedEdgeBySide.get(key);
    if (
      current === undefined ||
      (side === "left" ? edgeX < current : edgeX > current)
    ) {
      occupiedEdgeBySide.set(key, edgeX);
    }
  }

  /**
   * Раскладывает ВСЕ branch-поддеревья (partnership'ы + solo, §16/§19) уже
   * размещённого на (personX, y) человека — супруг каждого partnership
   * встаёт рядом (§9: husband-left/wife-right — определяется по gender, не
   * по тому, кто "personId"), а дети этой пары центрируются под junction'ом
   * пары (§10). Несколько партнёрств раскладываются бок о бок с
   * REMARRIAGE_GAP, симметрично вокруг personX, чтобы человек оставался
   * визуально "в середине" своих браков (§19 diagram).
   *
   * personId ставится на personX (свою "домашнюю" позицию) СРАЗУ здесь,
   * ДО обхода branches — если оставить это placeBranch (который решает,
   * куда ставить personId, только когда он ещё не размещён), при НЕСКОЛЬКИХ
   * партнёрствах (ремарьяж, §19) первый branch размещает personId в СВОЁМ
   * branchCenterX-относительном месте, а второй branch видит personId уже
   * "alreadyPlaced" и переиспользует ЭТУ позицию как основу для СВОЕГО
   * супруга — но т.к. isPersonLeft (male слева) для ОБОИХ браков обычно
   * одинаков, второй супруг получает ТОТ ЖЕ смещённый offset от той же базы,
   * что и первый, и оба супруга (и их дети) физически совпадают (см.
   * историю бага: b и d — оба супруга A — оказывались в одной точке).
   */
  function placeDescendantBranches(
    personId: string,
    personX: number,
    y: number,
  ): void {
    const alreadyHadPosition = placedPersons.has(personId);
    setPosition(personId, personX, y);
    const homeX = positionByPerson.get(personId)!.x;

    // Уже посещённые (visitedPartnerships) branches исключаются ДО расчёта
    // ширины/cursor — если оставить их в списке, они "съедают" слот в
    // симметричной раскладке (§19 diagram), но placeBranch для них — no-op
    // (см. guard в начале placeBranch), и центрирование остальных branches
    // вокруг мнимого "totalWidth с учётом уже занятого branch" даёт неверный
    // branchCenterX для НОВЫХ branches (см. историю бага: второй брак супруга
    // — F — вычислялся относительно фантомного слота первого брака и
    // накладывался на A).
    const branches = branchesOf(graph, personId).filter(
      (b) => !isVisitedBranch(b),
    );
    if (branches.length === 0) return;

    const cache = new Map<string, number>();
    const branchWidths = branches.map((b) => branchWidth(b, cache));

    if (!alreadyHadPosition) {
      // personId ещё не был зафиксирован НИКЕМ — центрируем ВСЕ (новые, т.к.
      // других и быть не может) branches симметрично вокруг homeX (обычный
      // случай — единственный брак, или первый проход по фокусу). personX
      // здесь ещё "подвижен" — пара может сдвинуться на 2×halfSpan от homeX
      // в любую сторону.
      //
      // useGenderDirection=true только при РОВНО одном branch — тогда
      // branchCenterX===homeX===personX и направление супруга однозначно
      // определяется husband-left/wife-right (§9). При НЕСКОЛЬКИХ branches
      // (§19 ремарьяж, разные партнёрства раскладываются side-by-side) КАЖДЫЙ
      // получил СВОЙ разнесённый branchCenterX выше — направление супруга
      // ДОЛЖНО следовать за branchCenterX (не gender), иначе разные супруги
      // одного пола совпадали бы в одной точке (см. историю бага: b и d).
      const useGenderDirection = branches.length === 1;
      const totalWidth =
        branchWidths.reduce((sum, w) => sum + w, 0) +
        REMARRIAGE_GAP * Math.max(0, branches.length - 1);
      let cursor = homeX - totalWidth / 2;
      for (let i = 0; i < branches.length; i++) {
        const width = branchWidths[i];
        const branchCenterX = cursor + width / 2;
        placeBranch(
          personId,
          branches[i],
          branchCenterX,
          y,
          useGenderDirection,
        );
        cursor += width + REMARRIAGE_GAP;
      }
      return;
    }

    // personId УЖЕ зафиксирован ЧУЖИМ вызовом (пришли сюда как чей-то
    // супруг ИЛИ как сиблинг в чьём-то ряду — сама карточка уже стоит на
    // homeX не по своей воле, не обязательно из-за ремарьяжа). Стартуем НЕ
    // от голого homeX, а от дальнего края УЖЕ ПОСЕЩЁННЫХ branches этого
    // personId (см. farthestOccupiedEdgeNear — сканирует ТОЛЬКО её
    // собственные visited partnerships, не весь Y) — иначе новый branch
    // может начать расти вправо ровно на расстояние, которое приземляет
    // супруга поверх УЖЕ занятой карточки (см. историю бага: второй муж B —
    // F — приземлялся ровно на карточку A).
    //
    // REMARRIAGE_GAP добавляется ТОЛЬКО если у personId УЖЕ ЕСТЬ visited
    // partnership (т.е. occupiedFarEdge реально отражает занятую ЧУЖИМ
    // браком территорию) — не для её первого и единственного брака (тот
    // зазор предназначен МЕЖДУ РАЗНЫМИ браками, а не между персоной и её
    // единственным супругом; см. историю бага: Елена Ушкар/Николай Ушкар,
    // Михаил/Марина Купчик оказывались на 352px, а не на 208px, друг от
    // друга — детально разобрано в финальном отчёте, Known limitations).
    const hasVisitedPartnership = (
      graph.personById.get(personId)?.partnershipIds ?? []
    ).some((pid) => visitedPartnerships.has(pid));
    const occupiedFarEdge = farthestOccupiedEdgeNear(personId, homeX, y);
    let cursor = occupiedFarEdge;
    for (let i = 0; i < branches.length; i++) {
      const width = branchWidths[i];
      const needsRemarriageGap = hasVisitedPartnership || i > 0;
      cursor += (needsRemarriageGap ? REMARRIAGE_GAP : 0) + width;
      const branchCenterX = cursor - width / 2;
      // useGenderDirection=true когда это ПЕРВЫЙ И ЕДИНСТВЕННЫЙ брак personId
      // (!needsRemarriageGap для i=0) — тогда branchCenterX здесь лишь
      // technical-артефакт farthestOccupiedEdgeNear/cursor-математики, а НЕ
      // геометрически значимая сторона: personX уже зафиксирован ЧУЖИМ
      // вызовом (напр. slotAnchorX сиблинг-ряда), который УЖЕ корректно
      // выбрал сторону personId под будущего супруга — placeBranch должен
      // довериться ЭТОЙ стороне (husband-left/wife-right, §9), а не знаку
      // branchOffset (см. историю бага: Марина Равбецкая оказывалась левее
      // мужа Виктора Равбецкого, т.к. branchCenterX "уехал" в сторону,
      // противоположную той, что уже зарезервировал slotAnchorX).
      const useGenderDirection = !needsRemarriageGap;
      placeBranch(personId, branches[i], branchCenterX, y, useGenderDirection);
    }
  }

  /**
   * Правый (дальний) край уже занятой территории на Y=`y`, начиная от
   * `homeX` — самая правая уже занятая карточка (right edge = x +
   * CARD_WIDTH/2) среди всех, чей x >= homeX. Новый (ранее не посещённый)
   * branch personId'а растёт вправо, начиная СТРОГО за этим краем — не
   * пересекая уже размещённые карточки того же Y (напр. первого супруга
   * personId'а, стоящего правее него).
   */
  /**
   * Дальний край УЖЕ РАЗМЕЩЁННЫХ СУПРУГОВ personId'а (его собственные,
   * ранее посещённые partnership'ы — НЕ произвольные чужие карточки на этом
   * же Y) — используется, чтобы новый (ещё не посещённый) брак personId'а
   * не приземлился поверх ЕГО ЖЕ предыдущего супруга.
   *
   * НЕ сканирует ВЕСЬ Y глобально (как было раньше) — глобальный скан
   * "любая карточка на этом Y правее homeX" подхватывал СОВЕРШЕННО
   * несвязанные, далёкие ветки (напр. Елена Ушкар оказывалась выброшена
   * далеко влево chained-раскладкой сиблингов, а её собственный новый брак
   * с Николаем Ушкаром высчитывался относительно БЛИЖАЙШЕЙ чужой карточки
   * где-то у фокуса — а не относительно её же реальной позиции, см.
   * историю бага). Если у personId ещё нет посещённых браков — просто
   * homeX (супруг встаёт прямо рядом).
   */
  function farthestOccupiedEdgeNear(
    personId: string,
    homeX: number,
    y: number,
  ): number {
    let farEdge = homeX;
    const person = graph.personById.get(personId);
    for (const partnershipId of person?.partnershipIds ?? []) {
      if (!visitedPartnerships.has(partnershipId)) continue;
      const partnership = graph.partnershipById.get(partnershipId)!;
      const spouseId =
        partnership.leftPersonId === personId
          ? partnership.rightPersonId
          : partnership.leftPersonId;
      const spousePos = positionByPerson.get(spouseId);
      if (!spousePos || spousePos.y !== y) continue;
      const edge = spousePos.x + CARD_WIDTH / 2;
      if (edge > farEdge) farEdge = edge;
    }
    return farEdge;
  }

  function isVisitedBranch(branch: Branch): boolean {
    return (
      branch.type === "partnership" &&
      visitedPartnerships.has(branch.partnershipId)
    );
  }

  function branchWidth(branch: Branch, cache: Map<string, number>): number {
    const ownWidth =
      branch.type === "partnership" ? CARD_WIDTH * 2 + SPOUSE_GAP : CARD_WIDTH;
    if (branch.childrenIds.length === 0) return ownWidth;
    const childIds = [...new Set(branch.childrenIds)];
    const childWidths = childIds.map((id) =>
      measurePersonDescendantWidth(graph, id, cache),
    );
    const childrenTotal =
      childWidths.reduce((sum, w) => sum + w, 0) +
      SIBLING_GAP * Math.max(0, childIds.length - 1);
    return Math.max(ownWidth, childrenTotal);
  }

  /**
   * Размещает один branch (супруг, если partnership) центрированным на
   * branchCenterX, и рекурсивно его детей на y + GENERATION_GAP.
   *
   * personId ВСЕГДА уже размещён к этому моменту (row-caller —
   * placeSiblingRowOneSided/placeChildrenRow/placeAncestorPairUndirected —
   * зарезервировал ему слот через slotAnchorX, либо placeDescendantBranches
   * проставил его "домашнюю" personX непосредственно перед вызовом).
   *
   * `symmetric` (передаётся вызывающим placeDescendantBranches) различает
   * ДВА принципиально разных случая:
   *  - symmetric=true — это ПЕРВЫЙ проход по personId (никто другой его ещё
   *    не фиксировал) — пара симметрична: супруг ровно 2×halfSpan от
   *    personX, junction — их середина (совпадает с branchCenterX по
   *    построению caller'а, единственный branch).
   *  - useGenderDirection=false — personId уже ОКОНЧАТЕЛЬНО зафиксирован
   *    ЧУЖИМ вызовом РАНЬШЕ, И этот branch — её ВТОРОЙ и далее брак (§19/
   *    §20 ремарьяж — сюда попали из placeDescendantBranches(...) при уже
   *    посещённой предыдущей partnership) — тогда branchCenterX геометрически
   *    ЗНАЧИМ (вычислен так, чтобы не приземлиться на предыдущего супруга),
   *    и направление берётся из sign(branchCenterX − personX), а не из
   *    gender (иначе второй супруг того же пола совпал бы с первым, см.
   *    историю бага: b и d — оба супруга A — в одной точке).
   */
  function placeBranch(
    personId: string,
    branch: Branch,
    branchCenterX: number,
    y: number,
    useGenderDirection: boolean,
  ): void {
    if (branch.type === "partnership") {
      if (visitedPartnerships.has(branch.partnershipId)) return;
      visitedPartnerships.add(branch.partnershipId);

      const spouse = graph.personById.get(branch.spouseId)!;
      const isPersonLeft = shouldBeLeft(
        graph.personById.get(personId)!.gender,
        spouse.gender,
        personId,
        branch.spouseId,
      );
      const halfSpan = (CARD_WIDTH + SPOUSE_GAP) / 2;
      const personX = positionByPerson.get(personId)!.x;

      // useGenderDirection=true (обычный, единственный на данный момент
      // брак — либо первый проход по personId, либо personId уже
      // зафиксирован ЧУЖИМ вызовом типа slotAnchorX, который УЖЕ выбрал ей
      // сторону под будущего супруга) — направление СТРОГО husband-left/
      // wife-right (§9) от РЕАЛЬНОЙ personX, branchCenterX игнорируется как
      // база направления (это лишь technical-артефакт cursor-математики в
      // placeDescendantBranches, не геометрически значимая сторона — см.
      // историю бага: Марина Равбецкая оказывалась ЛЕВЕЕ мужа Виктора
      // Равбецкого, т.к. branchCenterX "уехал" в сторону, противоположную
      // той, что уже зарезервировал slotAnchorX).
      //
      // useGenderDirection=false (§19 ремарьяж, второй и далее брак) —
      // branchCenterX геометрически значим, направление — его знак
      // относительно personX.
      const spouseGoesRight = useGenderDirection
        ? isPersonLeft
        : branchCenterX > personX;
      const spouseTargetX = spouseGoesRight
        ? personX + 2 * halfSpan
        : personX - 2 * halfSpan;
      const junctionX = (personX + spouseTargetX) / 2;

      setPosition(personId, personX, y);
      setPosition(branch.spouseId, spouseTargetX, y);
      junctionByPartnership.set(branch.partnershipId, { x: junctionX, y });

      placeChildrenRow(branch.childrenIds, junctionX, y);

      // Супруг (branch.spouseId) может САМ иметь ДРУГИЕ партнёрства (§19/§20
      // — напр. B замужем и за A, и (позже, отдельным браком) за F) — без
      // этого рекурсивного захода в его branches дерево обходится ТОЛЬКО от
      // фокуса вниз через его собственные branches, и второй брак супруга
      // никогда не посещается (см. историю бага: F и G — сын супруга B от
      // другого брака — не размещались вовсе, §32 "unsupported graph shape"
      // фактически означало "не полностью обошли граф", не "граф
      // некорректен"). visitedPartnerships (guard выше) предотвращает
      // бесконечную взаимную рекурсию A→B→[та же a-b]→A→... — без него
      // stack overflow (см. историю бага).
      placeDescendantBranches(branch.spouseId, spouseTargetX, y);
      return;
    }

    placeChildrenRow(branch.childrenIds, branchCenterX, y);
  }

  /**
   * Позиция person'а ВНУТРИ его зарезервированного слота [slotCenter ±
   * slotWidth/2] — если у него ровно одно partnership-branch без детей ИЛИ с
   * детьми (не важно, ширина слота уже это учла в measurePersonDescendantWidth),
   * возвращает НЕ центр слота, а точку, оставляющую место для супруга на
   * "внешней" стороне (той, куда он должен встать по gender). Если у person'а
   * несколько branches, детей нет ни у одного branch, либо branch отсутствует
   * вовсе — просто центр слота (нечего резервировать под супруга особым
   * образом, placeDescendantBranches сам всё центрирует симметрично).
   */
  function slotAnchorX(personId: string, slotCenter: number): number {
    const branches = branchesOf(graph, personId);
    const partnershipBranches = branches.filter(
      (b): b is Extract<Branch, { type: "partnership" }> =>
        b.type === "partnership",
    );
    if (branches.length !== 1 || partnershipBranches.length !== 1)
      return slotCenter;

    const branch = partnershipBranches[0];
    const person = graph.personById.get(personId)!;
    const spouse = graph.personById.get(branch.spouseId)!;
    const isPersonLeft = shouldBeLeft(
      person.gender,
      spouse.gender,
      personId,
      branch.spouseId,
    );
    const halfSpan = (CARD_WIDTH + SPOUSE_GAP) / 2;
    return isPersonLeft ? slotCenter - halfSpan : slotCenter + halfSpan;
  }

  /**
   * Только для direction==="free" (сиблинги самого фокуса, §11) — если у
   * personId ровно одно partnership-branch, супруг уже занял одну из сторон
   * (husband-left/wife-right, §9) через slotAnchorX/placeBranch; сиблинги
   * должны расти в СВОБОДНУЮ сторону, а не сталкиваться с уже размещённым
   * супругом. Без ровно одного partnership (нет брака, либо ремарьяж с
   * несколькими) — прежний дефолт "вправо" (нет одной явно занятой стороны).
   */
  function freeDirectionGrowsLeft(personId: string): boolean {
    const branches = branchesOf(graph, personId);
    const partnershipBranches = branches.filter(
      (b): b is Extract<Branch, { type: "partnership" }> =>
        b.type === "partnership",
    );
    if (partnershipBranches.length !== 1) return false;
    const spouse = graph.personById.get(partnershipBranches[0].spouseId)!;
    const person = graph.personById.get(personId)!;
    // Если personId сам стоит слева от супруга (husband-left, §9) — супруг
    // занял правую сторону, значит сиблинги растут ЕЩЁ левее (прочь от
    // супруга). Если personId справа (wife-right) — сиблинги растут вправо.
    return shouldBeLeft(
      person.gender,
      spouse.gender,
      personId,
      partnershipBranches[0].spouseId,
    );
  }

  /** husband-left/wife-right (§9): male слева. Если оба unknown/same gender — детерминированный tie-break по id (§43). */
  function shouldBeLeft(
    personGender: "male" | "female" | "unknown",
    spouseGender: "male" | "female" | "unknown",
    personId: string,
    spouseId: string,
  ): boolean {
    const rank = (g: "male" | "female" | "unknown") =>
      g === "male" ? 0 : g === "unknown" ? 1 : 2;
    const pr = rank(personGender);
    const sr = rank(spouseGender);
    if (pr !== sr) return pr < sr;
    return personId <= spouseId;
  }

  /** true, если у personId нет НИ ОДНОГО partnership-branch (§16) — ни супруга, ни, соответственно, общих с супругом детей. Solo-дети (без второго родителя в этом графе) НЕ считаются partnership — они не создают собственную пару рядом с personId. */
  function hasNoPartnership(personId: string): boolean {
    return !branchesOf(graph, personId).some((b) => b.type === "partnership");
  }

  /**
   * Зазор МЕЖДУ ДВУМЯ конкретными соседними сиблингами в ряду (§11) — узкий
   * SPOUSE_GAP, если у ОБОИХ нет собственного партнёрства (ни у одного нет
   * супруга рядом, "занимающего" его дальнюю сторону), иначе обычный
   * SIBLING_GAP. Product requirement: сиблинги без пары должны читаться как
   * единая плотная семейная группа (как если бы они сами были парой) — если
   * ХОТЯ БЫ У ОДНОГО из двух соседей есть супруг (который уже стоит рядом с
   * НИМ отдельной карточкой), возвращаемся к обычному SIBLING_GAP: иначе
   * узкий зазор читался бы как "эта пара сиблингов тоже семья", хотя рядом
   * уже есть настоящая пара.
   */
  function siblingGapBetween(idA: string, idB: string): number {
    return hasNoPartnership(idA) && hasNoPartnership(idB)
      ? SPOUSE_GAP
      : SIBLING_GAP;
  }

  /** Раскладывает список детей (уникализированных) в ряд, центрированный на centerX, на y + GENERATION_GAP (§10) — каждый занимает measurePersonDescendantWidth. Зазор МЕЖДУ соседями — siblingGapBetween (узкий SPOUSE_GAP, если оба без пары, иначе SIBLING_GAP, §11). */
  function placeChildrenRow(
    childrenIds: string[],
    centerX: number,
    y: number,
  ): void {
    const childIds = [...new Set(childrenIds)];
    if (childIds.length === 0) return;

    const cache = new Map<string, number>();
    const widths = childIds.map((id) =>
      measurePersonDescendantWidth(graph, id, cache),
    );
    const gaps = childIds
      .slice(1)
      .map((id, i) => siblingGapBetween(childIds[i], id));
    const totalWidth =
      widths.reduce((sum, w) => sum + w, 0) +
      gaps.reduce((sum, g) => sum + g, 0);

    let cursor = centerX - totalWidth / 2;
    const childY = y + GENERATION_GAP;
    for (let i = 0; i < childIds.length; i++) {
      const width = widths[i];
      const childCenterX = cursor + width / 2;
      setPosition(childIds[i], slotAnchorX(childIds[i], childCenterX), childY);
      placeDescendantBranches(childIds[i], childCenterX, childY);
      cursor += width + (gaps[i] ?? 0);
    }
  }

  // ---------------------------------------------------------------------
  // Ancestors — paternal (left) / maternal (right) fork (§7/§8/§9).
  // ---------------------------------------------------------------------

  /**
   * Поднимает personId к его родителям (§7/§8/§9) — родительская ПАРА
   * ВСЕГДА размещается рядом друг с другом (husband-left/wife-right,
   * §9 — "супруги должны находиться всегда рядом, независимо сколько
   * сиблингов", подтверждённое требование продукта: см. историю — линия
   * partnership между физически далёкими супругами читалась как
   * пересекающая несвязанные карточки сиблингов, что нарушает "линии-
   * коннекторы никогда не пересекаются").
   *
   * Paternal/maternal (§7/§8) — направление, в которую растут ветки ВЫШЕ
   * этой пары (её собственные родители и их предки), а НЕ то, в какую
   * сторону расходится сама пара: husband (leftId) поднимается с
   * direction="left" (его собственные предки будут левее), wife (rightId) —
   * с direction="right" — см. placeAncestorPairUndirected, где
   * direction="free" уже даёт именно это разбиение при первом вызове.
   */
  function placeAncestorFork(
    personId: string,
    anchorX: number,
    anchorY: number,
    direction: "left" | "right" | "free",
  ): void {
    placeAncestorPairUndirected(personId, anchorX, anchorY, direction);
  }

  /** Полные сиблинги personId (та же пара родителей) — без paternal/maternal фильтра, т.к. вызывается уже ВНУТРИ одной определённой стороны. */
  function fullSiblingsOf(personId: string): string[] {
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

  /**
   * Недирекционный (`direction==="free"`) ИЛИ унаследованный (`"left"`/
   * `"right"` — уже внутри одной half-plane выше по стеку, см.
   * placeAncestorFork) случай подъёма на одно поколение: сиблинги персоны
   * кладутся рядом с ней, родитель(и) центрируются над рядом.
   *
   * Направление роста КАЖДОГО ряда на этом шаге (и sibling-row самой
   * personId, и — рекурсивно — sibling-row'ов её родителей aId/bId) должно
   * согласовываться с direction, унаследованным от самого верхнего fork'а:
   * если мы уже внутри paternal half-plane (direction="left"), твой сиблинг
   * ДОЛЖЕН расти ещё левее — не "просто вправо от своей anchorX", иначе два
   * физически независимых ряда на одном Y (papa-side и mama-side, либо два
   * сиблинга разных предков papa-side) не знают друг о друге и могут
   * столкнуться (см. историю бага: Марфа Купчик (papa-side) сходилась с
   * Григорием Кривушей (papa-side тоже, но через другого предка Елизаветы
   * Купчик) — оба независимо росли "вправо от своей anchorX"). При
   * direction="free" (единственный родитель фокуса без paternal/maternal
   * развилки, либо синтетический граф без чёткого papa/mama различия) —
   * растим вправо по умолчанию (детерминированно, §43), без ограничения.
   */
  /**
   * Раскладывает сиблингов `personId` (§11) ВОКРУГ его УЖЕ зафиксированной
   * (не переизмеряемой) позиции `anchorX` — growLeft=true растит их влево,
   * false — вправо. В отличие от placeSiblingRowOneSided (которая заново
   * измеряет и позиционирует САМ `personId` как часть ряда, начиная от
   * outerEdge), эта функция трактует anchorX как неприкосновенный якорь —
   * нужно, когда personId уже является частью зафиксированной пары (couple),
   * чья ширина в measurePersonDescendantWidth УЖЕ включает брак: повторное
   * измерение через ту же функцию задвоило бы ширину брака (см. историю
   * бага в вызывающем коде placeAncestorPairUndirected: pgf/pgm — дед и
   * бабка — оказывались ровно CARD_WIDTH, а не CARD_WIDTH+SPOUSE_GAP, друг
   * от друга). Возвращает и x середины всего ряда (personId + сиблинги —
   * то, над чем в итоге центрируется родительская пара), и дальний (outer)
   * край ряда — нужен вызывающему коду для "chained" размещения ВТОРОГО
   * независимого ряда на этой же стороне сразу ЗА этим (см. историю бага:
   * Марфа Купчик (ряд Николая Купчика) сталкивалась с Григорием Кривушей
   * (ряд Елизаветы Купчик) — оба независимо росли от одной точки).
   */
  function placeFixedAnchorSiblingRow(
    personId: string,
    growLeft: boolean,
    anchorX: number,
    y: number,
    /** Если задан — сиблинги стартуют ОТСЮДА (уже сдвинутый чужим рядом край, "chained"), а не от края собственной карточки personId (см. вызывающий код placeAncestorPairUndirected — leftId/rightId растят siblings подряд на одной стороне). personId САМ остаётся на anchorX независимо от этого параметра. */
    siblingsStartEdgeX?: number,
  ): { rowCenterX: number; outerEdgeX: number } {
    const side: "left" | "right" = growLeft ? "left" : "right";
    const siblingIds = fullSiblingsOf(personId);
    const cache = new Map<string, number>();
    // Сиблинги personId'а должны начинаться от края ЕГО СОБСТВЕННОЙ карточки
    // (+ супруга, ЕСЛИ супруг сидит на ТОЙ ЖЕ стороне, куда растёт ряд) — НЕ
    // от края всего его поддерева потомков. measurePersonDescendantWidth(
    // personId) включает ширину ВСЕХ детей personId'а (напр. Николай Купчик —
    // его сын Виктор со своей семьёй даёт personWidth=1648px), но дети
    // размещаются НИЖЕ (следующий Y) и никак не мешают сиблингам personId'а
    // того же поколения — использование полного personWidth здесь просто
    // раздувало зазор между personId и ЕГО первым сиблингом на сотни лишних
    // px (см. историю бага: Михаил/Марина Купчик оказывались на 952px от
    // Николая Купчика вместо ~200px).
    //
    // ВАЖНО: anchorX — это позиция САМОГО personId (его карточки), а НЕ
    // центр его пары с супругом — husband-left/wife-right (§9) ставит их
    // асимметрично (супруг СБОКУ, не "вокруг" personId). Раньше здесь
    // безусловно резервировался СИММЕТРИЧНЫЙ блок CARD_WIDTH*2+SPOUSE_GAP
    // вокруг anchorX в обе стороны — это верно только когда супруг сидит
    // ИМЕННО на стороне роста ряда; когда супруг на ПРОТИВОПОЛОЖНОЙ стороне
    // (напр. Александр растит сиблингов влево, а Элеонора стоит справа от
    // него), этот блок ошибочно тратил лишние ~2×SPOUSE_GAP+CARD_WIDTH px в
    // сторону роста, где супруга физически нет (см. историю бага: Дарья
    // Купчик получала зазор 168px до Александра вместо ожидаемых
    // 2×SPOUSE_GAP=64px — "сиблинги должны отстоять друг от друга вдвое
    // больше, чем супруги"). Теперь используем РЕАЛЬНУЮ сторону супруга
    // (та же формула, что и slotAnchorX/freeDirectionGrowsLeft): расширяем
    // personOwnEdge под супруга ТОЛЬКО если он на стороне growLeft/right.
    const personBranches = branchesOf(graph, personId);
    const partnershipBranch = personBranches.find(
      (b): b is Extract<Branch, { type: "partnership" }> =>
        b.type === "partnership",
    );
    const halfSpan = (CARD_WIDTH + SPOUSE_GAP) / 2;
    let spouseOnGrowthSide = false;
    if (personBranches.length === 1 && partnershipBranch) {
      const spouse = graph.personById.get(partnershipBranch.spouseId)!;
      const person = graph.personById.get(personId)!;
      const personIsLeftOfSpouse = shouldBeLeft(
        person.gender,
        spouse.gender,
        personId,
        partnershipBranch.spouseId,
      );
      // growLeft=true растит ряд влево — супруг мешает ТОЛЬКО если он тоже
      // слева от personId (т.е. personId справа от супруга, !personIsLeftOfSpouse).
      spouseOnGrowthSide = growLeft
        ? !personIsLeftOfSpouse
        : personIsLeftOfSpouse;
    }
    // Край блока в сторону роста: если супруг на этой стороне — до ЕГО
    // дальнего края (anchorX ± (2×halfSpan + CARD_WIDTH/2), т.к. супруг
    // стоит в 2×halfSpan от personId, §9); иначе — до собственного края
    // personId'а (anchorX ± CARD_WIDTH/2), супруг тут вообще не участвует.
    const personOwnEdge = growLeft
      ? anchorX -
        (spouseOnGrowthSide ? 2 * halfSpan + CARD_WIDTH / 2 : CARD_WIDTH / 2)
      : anchorX +
        (spouseOnGrowthSide ? 2 * halfSpan + CARD_WIDTH / 2 : CARD_WIDTH / 2);
    // personLeftEdge/personRightEdge — РЕАЛЬНЫЕ (асимметричные) края
    // "домашнего" блока personId'а, независимо от направления роста (нужны
    // ниже для minX/maxX seed → rowCenterX, на который центрируется
    // родительская пара, §10). Если супруг есть — он стоит СТРОГО с одной
    // стороны (husband-left/wife-right, §9), не "вокруг" personId
    // симметрично — раньше здесь применялся симметричный
    // CARD_WIDTH*2+SPOUSE_GAP блок вокруг anchorX В ОБЕ СТОРОНЫ (как для
    // personOwnEdge выше, до фикса), что сдвигало rowCenterX (и, значит,
    // центр родительской пары над рядом детей) на фантомные ~104px в
    // сторону, где супруга физически нет (см. историю бага: родители
    // Виктора — Николай Купчик ст. + Елизавета — оказывались на 388px
    // левее реального центра своих 4 детей (Наталья..Виктор), т.к. Виктор
    // (последний в ряду, с супругой Галиной справа) добавлял в minX/maxX
    // seed лишний "виртуальный" запас под Галину на ЛЕВОЙ стороне тоже,
    // хотя она физически справа).
    let personLeftEdge = anchorX - CARD_WIDTH / 2;
    let personRightEdge = anchorX + CARD_WIDTH / 2;
    if (personBranches.length === 1 && partnershipBranch) {
      const spouse = graph.personById.get(partnershipBranch.spouseId)!;
      const person = graph.personById.get(personId)!;
      const personIsLeftOfSpouse = shouldBeLeft(
        person.gender,
        spouse.gender,
        personId,
        partnershipBranch.spouseId,
      );
      if (personIsLeftOfSpouse) {
        personRightEdge = anchorX + 2 * halfSpan + CARD_WIDTH / 2;
      } else {
        personLeftEdge = anchorX - 2 * halfSpan - CARD_WIDTH / 2;
      }
    }
    const chainedEdge =
      siblingsStartEdgeX !== undefined
        ? growLeft
          ? Math.min(siblingsStartEdgeX, personOwnEdge)
          : Math.max(siblingsStartEdgeX, personOwnEdge)
        : personOwnEdge;
    // §25 safety net: clamp против ЛЮБОЙ независимой ветки, ранее занявшей
    // территорию на этой (y, side) — не только против явно "chained" вызова
    // с известным siblingsStartEdgeX (см. историю бага: Марфа Купчик и
    // Григорий Кривуша — НИКАКОЙ общий caller не связывал их напрямую).
    const globalEdge = occupiedEdge(y, side);
    const startEdge = growLeft
      ? Math.min(chainedEdge, globalEdge)
      : Math.max(chainedEdge, globalEdge);
    let cursor = startEdge;
    // minX/maxX (и, в конце, outerEdgeX/extendOccupiedEdge) должны отражать
    // РЕАЛЬНО занятую территорию НА ЭТОМ Y — т.е. ширину собственной карточки
    // anchor'а (+ супруга), НЕ его полного поддерева потомков. personWidth
    // (measurePersonDescendantWidth) включает детей anchor'а, но они стоят
    // НИЖЕ (следующий Y) — резервировать под них место на ЭТОМ ряду через
    // extendOccupiedEdge означало ошибочно "застолбить" на текущем Y гораздо
    // больше пространства, чем anchor физически занимает, и когда сиблингов
    // у anchor'а нет вовсе (самый частый случай для дедушек/бабушек без
    // братьев/сестёр), outerEdgeX мог уехать на сотни px дальше своей
    // настоящей карточки — а именно на этот occupiedEdge потом ориентируется
    // ПРОТИВОПОЛОЖНАЯ (paternal/maternal) сторона того же Y при перекрёстном
    // clamp'е (см. minHalfPlaneGap ниже в placeAncestorPairUndirected) — из-
    // за раздутого края она зря отодвигалась в сторону, хотя реальной
    // коллизии не было (см. историю бага: Николай Козловский/Надежда
    // Козловская уезжали на x=200/400 вместо симметричных 0/208 вокруг
    // Галины, хотя у Николая Купчика — единственной paternal-карточки на том
    // же Y — не было даже сиблингов, чтобы оправдать такой отступ).
    let minX = personLeftEdge;
    let maxX = personRightEdge;
    // ownCardMinX/ownCardMaxX — то же самое, но СТРОГО по картам детей
    // (personId и его сиблингов), БЕЗ супругов — на это центрируется
    // родительская пара (rowCenterX, §10 "родители должны быть отцентрированы
    // с их детьми"). Родитель центрируется именно над рядом СВОИХ детей, а не
    // над "всем физически занятым пространством" — супруг ребёнка (напр.
    // Галина, жена Виктора) не входит в расчёт центра, даже стоя вплотную
    // (см. историю бага: minX/maxX выше уже включают Галину для outerEdgeX/
    // occupiedEdge — это верно для коллизий, но НЕ для центрирования: раньше
    // единый minX/maxX использовался для ОБОИХ назначений, и родители Виктора
    // — Николай Купчик ст. + Елизавета — оказывались на ~400px в стороне от
    // реального центра своих 4 детей).
    let ownCardMinX = anchorX - CARD_WIDTH / 2;
    let ownCardMaxX = anchorX + CARD_WIDTH / 2;
    // prevId — сосед, от которого растёт текущий шаг цикла: сам personId на
    // первой итерации, дальше — предыдущий уже размещённый сиблинг. Нужен,
    // чтобы каждая ПАРА соседей в ряду получала свой собственный gap
    // (siblingGapBetween, §11) — не единый SIBLING_GAP на весь ряд.
    let prevId = personId;
    for (const siblingId of siblingIds) {
      const width = measurePersonDescendantWidth(graph, siblingId, cache);
      // Этот сиблинг мог УЖЕ быть размещён РАНЬШЕ другим вызовом этой же
      // функции — placeFixedAnchorSiblingRow вызывается ДВАЖДЫ на одного и
      // того же personId: один раз "снизу" (от уровня ребёнка personId'а —
      // реально кладёт карточки сиблингов на экран) и один раз "изнутри"
      // placeAncestorPairUndirected(personId,...) (нужен только чтобы
      // получить rowCenterX для центрирования РОДИТЕЛЕЙ personId'а). Второй
      // вызов НЕ должен заново симулировать cursor-математику поверх уже
      // занятого occupiedEdge (который первый вызов уже продвинул) — это
      // считало бы позиции "ещё раз, начиная от края первого прохода",
      // унося фантомный ownCardMinX/ownCardMaxX на сотни/тысячи px дальше
      // реальных карточек (см. историю бага: rowCenterX для родителей
      // Виктора получался -880 вместо истинного центра его 4 детей -552,
      // т.к. второй проход стартовал от -968 — левого края уже размещённой
      // Натальи из ПЕРВОГО прохода — вместо родного края Виктора -312).
      // Вместо пересчёта — просто читаем уже сохранённую реальную позицию.
      const alreadyPlacedPos = placedPersons.has(siblingId)
        ? positionByPerson.get(siblingId)
        : undefined;
      let centerX: number;
      let siblingOwnX: number;
      if (alreadyPlacedPos) {
        siblingOwnX = alreadyPlacedPos.x;
        centerX = siblingOwnX;
        cursor = growLeft ? siblingOwnX - width / 2 : siblingOwnX + width / 2;
      } else {
        const gap = siblingGapBetween(prevId, siblingId);
        cursor += growLeft ? -(gap + width) : gap + width;
        centerX = growLeft ? cursor + width / 2 : cursor - width / 2;
        siblingOwnX = slotAnchorX(siblingId, centerX);
        setPosition(siblingId, siblingOwnX, y);
        placeDescendantBranches(siblingId, centerX, y);
      }
      minX = Math.min(minX, centerX - width / 2);
      maxX = Math.max(maxX, centerX + width / 2);
      ownCardMinX = Math.min(ownCardMinX, siblingOwnX - CARD_WIDTH / 2);
      ownCardMaxX = Math.max(ownCardMaxX, siblingOwnX + CARD_WIDTH / 2);
      prevId = siblingId;
    }
    const outerEdgeX = growLeft ? minX : maxX;
    extendOccupiedEdge(y, side, outerEdgeX);
    return { rowCenterX: (ownCardMinX + ownCardMaxX) / 2, outerEdgeX };
  }

  function placeAncestorPairUndirected(
    personId: string,
    anchorX: number,
    anchorY: number,
    direction: "left" | "right" | "free",
  ): void {
    const person = graph.personById.get(personId)!;
    const parentIds = person.parentIds;
    const primaryParentId = parentIds[0];
    // direction==="free" — только у самого фокуса (единственный вызов без
    // унаследованной paternal/maternal стороны, см. вызов в placeGraph). Раньше
    // здесь был жёсткий дефолт "расти вправо", который игнорировал супруга
    // фокуса — если у фокуса есть партнёрство (муж слева/жена справа, §9),
    // его сиблинги должны расти в СВОБОДНУЮ сторону (противоположную супругу),
    // а не в ту же, куда уже встал супруг: рост "вправо" при живущей там
    // Элеоноре приземлял сиблинга (Дарью) ЗА её карточкой — читалось как
    // "сестра фокуса стоит рядом с его женой", а не рядом с самим фокусом
    // (см. историю бага: Дарья Купчик оказывалась на x=396, ПОСЛЕ Элеоноры
    // на x=208, вместо места слева от Александра на x=0).
    const growLeft =
      direction === "left" ||
      (direction === "free" && freeDirectionGrowsLeft(personId));

    const { rowCenterX } = placeFixedAnchorSiblingRow(
      personId,
      growLeft,
      anchorX,
      anchorY,
    );

    const parentUnitY = anchorY - GENERATION_GAP;
    if (parentIds.length === 2) {
      const [aId, bId] = parentIds;
      if (!placedPersons.has(aId) && !placedPersons.has(bId)) {
        const a = graph.personById.get(aId)!;
        const b = graph.personById.get(bId)!;
        const isALeft = shouldBeLeft(a.gender, b.gender, aId, bId);
        const [leftId, rightId] = isALeft ? [aId, bId] : [bId, aId];

        // Внутри УЖЕ направленной half-plane (direction !== "free") — оба
        // родителя и ИХ sibling-row'ы растут в ТУ ЖЕ сторону, что и вся
        // ветка (не переоткрываем paternal/maternal развилку на этом
        // уровне — та развилка бывает РОВНО ОДИН раз, у самого фокуса).
        // При direction="free" — прежнее поведение (aId влево, bId вправо
        // от rowCenterX), т.к. здесь ничто ещё не ограничивает стороны.
        const leftSide = direction === "free" ? "left" : direction;
        const rightSide = direction === "free" ? "right" : direction;
        // При leftSide===rightSide (уже внутри одной half-plane) два ряда
        // ДОЛЖНЫ идти ПОДРЯД друг за другом на этой же стороне — второй
        // получает outerEdge, оставленный первым, а не тот же rowCenterX
        // (иначе оба ряда стартуют из одной точки и накладываются, см.
        // историю бага: Николай Купчик и Елизавета Купчик — оба "papa-side",
        // но независимые предковые линии — оба росли "влево от rowCenterX").
        const chained = leftSide === rightSide;

        // leftId и rightId — ЧЕТА (пара), не два независимых "sibling-row
        // root'а": оба состоят в ОДНОМ partnership друг с другом. Ставим их
        // СНАЧАЛА как couple (halfSpan друг от друга, §9), и уже ОТ КРАЯ
        // этой пары растим отдельно СВОИХ сиблингов (дядья/тёти персоны,
        // если есть) наружу через placeSiblingRowOneSided. Если использовать
        // placeSiblingRowOneSided НА САМОЙ паре (как раньше), каждый из
        // leftId/rightId меряется через measurePersonDescendantWidth,
        // который УЖЕ включает ширину их ОБЩЕГО брака (супруг+дети) — оба
        // получают ОДИНАКОВЫЙ 384px слот за один и тот же брак, и пара
        // накладывается сама на себя (см. историю бага: pgf/pgm — дед и
        // бабка по отцовской линии — оказывались ровно CARD_WIDTH, а не
        // CARD_WIDTH+SPOUSE_GAP, друг от друга).
        const halfSpan = (CARD_WIDTH + SPOUSE_GAP) / 2;
        const leftAlreadyPlaced = placedPersons.has(leftId);
        const rightAlreadyPlaced = placedPersons.has(rightId);

        // Чета (leftId/rightId — родители personId'а) центрируется РОВНО
        // над своим ребёнком (rowCenterX ± halfSpan) — БЕЗ клампа против
        // occupiedEdge чужой, никак не связанной пары на том же Y/стороне.
        //
        // Раньше здесь стоял clamp против occupiedEdge(parentUnitY, side) —
        // задуман для СИБЛИНГОВ personId'а (дядья/тёти, растущие НАРУЖУ от
        // уже размещённой четы, см. leftGrowLeft/rightGrowLeft ниже), но по
        // ошибке применялся и к САМОЙ чете. personId — ЖЕНА в паре (напр.
        // Елизавета Купчик, rightId с точки зрения ЕЁ РОДИТЕЛЕЙ выше по
        // дереву) НЕ имеет отношения к occupiedEdge, который уже застолбили
        // родители её МУЖА (Николай ст. → Владимир+Марфа) — это ДВЕ разные,
        // никак не связанные родословные линии, просто совпавшие по Y и
        // общему paternal half-plane. Clamp сдвигал родителей жены (Григорий
        // +Елизавета Кривуша) ЗА пределы уже занятого мужниной линией края —
        // в итоге они вставали ЛЕВЕЕ родителей мужа, читаясь как "родители
        // Елизаветы — со стороны Николая", хотя должны расти строго над
        // САМОЙ Елизаветой (см. историю бага). Потенциальное физическое
        // пересечение двух независимо центрированных пар на одном Y (редкий
        // случай — CARD_WIDTH+SPOUSE_GAP её самой узкий) разрешается ОТДЕЛЬНО
        // после полного placeGraph тем же generic-механизмом, что и для
        // дедушек/бабушек фокуса (см. collision.ts::resolveGrandparentSymmetry,
        // §25 — hard no-overlap constraint важнее локальной оптимизации).
        const coupleCenterX = rowCenterX;

        // Перекрёстный (paternal↔maternal) конфликт на этом Y больше НЕ
        // разрешается здесь точечным clamp'ом одной из двух пар — это давало
        // асимметрию по построению (какая из двух пар накладывает clamp,
        // зависело от порядка direction="left"/"right", т.е. ВСЕГДА двигалась
        // только одна сторона, а другая оставалась идеально центрированной
        // над своим ребёнком — читалось как "у одних дедушек с бабушками линия
        // прямая, у других — сломанная", хотя отношения симметричны, см.
        // историю бага и product feedback: "дерево Виктора и Галины должны
        // быть симметричными"). Вместо этого обе пары остаются здесь
        // центрированными РОВНО над своим ребёнком (rowCenterX ± halfSpan,
        // без клампа) — потенциальное пересечение с противоположной half-
        // plane на этом же Y разрешается ОДНИМ симметричным проходом ПОСЛЕ
        // полного placeGraph (см. collision.ts::resolveGrandparentSymmetry) —
        // раздвигает ОБЕ пары поровну от их анкеров, если они физически
        // пересекаются, так что итоговое смещение (если оно вообще нужно)
        // одинаково по величине и противоположно по знаку для paternal и
        // maternal стороны.
        if (!leftAlreadyPlaced)
          setPosition(leftId, coupleCenterX - halfSpan, parentUnitY);
        if (!rightAlreadyPlaced)
          setPosition(rightId, coupleCenterX + halfSpan, parentUnitY);
        if (direction === "left") {
          extendOccupiedEdge(
            parentUnitY,
            "left",
            coupleCenterX - halfSpan - CARD_WIDTH / 2,
          );
        }
        if (direction === "right") {
          extendOccupiedEdge(
            parentUnitY,
            "right",
            coupleCenterX + halfSpan + CARD_WIDTH / 2,
          );
        }

        // Каждая сторона растит СВОИХ сиблингов (дядья/тёти персоны, если
        // есть) НАРУЖУ от уже зафиксированной пары — через тот же
        // placeFixedAnchorSiblingRow, который использует anchor КАК ЕСТЬ (не
        // переизмеряет его через measurePersonDescendantWidth, который уже
        // посчитал бы их общий брак ВТОРОЙ раз — см. историю бага выше).
        //
        // "Наружу" здесь ВСЕГДА означает "дальше в сторону унаследованного
        // direction" (leftSide/rightSide), а НЕ "leftId обязательно влево,
        // rightId обязательно вправо" — при chained===true (уже внутри ОДНОЙ
        // half-plane, напр. maternal) leftId (муж пары) и rightId (жена)
        // могут ОБА физически стоять справа от x=0, и сиблинги ОБОИХ должны
        // расти ЕЩЁ правее (deeper into maternal territory), не влево — см.
        // историю бага: сиблинги Николая Козловского (Юзик/Даниил/Алексей,
        // maternal branch) раньше жёстко получали growLeft=true независимо
        // от direction и улетали в paternal-территорию (x=-5056, левее даже
        // Григория Кривуши) — читалось как "перепутанные семьи Козловских и
        // Купчиков", хотя связи в данных были верны. При direction==="free"
        // (chained=false, самый верхний fork у фокуса) — прежнее поведение:
        // leftId растит влево, rightId вправо (paternal/maternal развилка).
        const leftGrowLeft = chained ? growLeft : true;
        const rightGrowLeft = chained ? growLeft : false;
        let leftOuterEdge: number | undefined;
        if (!leftAlreadyPlaced) {
          leftOuterEdge = placeFixedAnchorSiblingRow(
            leftId,
            leftGrowLeft,
            positionByPerson.get(leftId)!.x,
            parentUnitY,
          ).outerEdgeX;
        }
        if (!rightAlreadyPlaced) {
          // chained (leftSide===rightSide, унаследованный direction общий
          // для leftId и rightId) — rightId'ов ряд сиблингов стартует ЗА
          // leftOuterEdge (дальше в ТУ ЖЕ сторону), не от собственного края
          // rightId (см. историю бага: два независимых ряда на одной
          // стороне пересекались). При direction="free" (chained=false) —
          // rightId растит вправо от своей обычной позиции, как раньше.
          placeFixedAnchorSiblingRow(
            rightId,
            rightGrowLeft,
            positionByPerson.get(rightId)!.x,
            parentUnitY,
            chained ? leftOuterEdge : undefined,
          );
        }

        const partnershipId = findSharedPartnershipId(aId, bId);
        if (partnershipId)
          junctionByPartnership.set(partnershipId, {
            x: coupleCenterX,
            y: parentUnitY,
          });

        // ПРИМЕЧАНИЕ: placeFixedAnchorSiblingRow (вызванный выше для
        // leftId/rightId) УЖЕ спускается в placeDescendantBranches для
        // каждого сиблинга внутри своего собственного цикла — повторный
        // проход здесь был бы избыточным ВТОРЫМ вызовом на тех же людей
        // (в отличие от placeSiblingRowOneSided в диспетчере diverging-fork
        // выше по файлу, который НАМЕРЕННО только резервирует позиции без
        // спуска в branches — см. "ФАЗА 1"/"ФАЗА 2" — здесь такого
        // разделения нет и не нужно). Повторный вызов приводил к тому, что
        // Елена Ушкар (сиблинг Елизаветы Купчик) посещалась
        // placeDescendantBranches несколько раз с разными personX за один
        // прогон, и её супруг (Николай Ушкар) в итоге вычислялся
        // относительно НЕ последней её реальной позиции (см. историю бага).
        placeAncestorFork(
          leftId,
          positionByPerson.get(leftId)!.x,
          parentUnitY,
          leftSide,
        );
        placeAncestorFork(
          rightId,
          positionByPerson.get(rightId)!.x,
          parentUnitY,
          rightSide,
        );
      }
    } else if (parentIds.length === 1 && !placedPersons.has(primaryParentId)) {
      setPosition(primaryParentId, rowCenterX, parentUnitY);
      placeAncestorFork(primaryParentId, rowCenterX, parentUnitY, direction);
    }
  }

  function findSharedPartnershipId(aId: string, bId: string): string | null {
    const a = graph.personById.get(aId);
    for (const partnershipId of a?.partnershipIds ?? []) {
      const partnership = graph.partnershipById.get(partnershipId)!;
      if (
        (partnership.leftPersonId === aId &&
          partnership.rightPersonId === bId) ||
        (partnership.leftPersonId === bId && partnership.rightPersonId === aId)
      ) {
        return partnershipId;
      }
    }
    return null;
  }
}
