import type { NormalizedGraph } from "./types";
import {
  CARD_WIDTH,
  REMARRIAGE_GAP,
  SIBLING_GAP,
  SPOUSE_GAP,
  branchesOf,
  measurePersonDescendantWidth,
  shouldBeLeft,
  type Branch,
} from "./subtree";
import {
  RowRegistry,
  collectAncestorFrontier,
  placeAncestorGeneration,
  type FrontierEntry,
} from "./ancestor-placement";

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

  // 2) Предки фокуса — breadth-first по поколениям, одно поколение
  // ЦЕЛИКОМ за раз (см. ancestor-placement.ts — заменяет старую
  // depth-first fork-рекурсию, которая проходила paternal-линию до конца
  // ПРЕЖДЕ чем maternal-линия вообще начинала размещаться, из-за чего
  // паре несвязанных ветвей на одном ряду не с чем было сверяться друг с
  // другом при первичном размещении — только post-hoc, см. историю
  // проекта). ownerByPerson — карта "кто чей" (заполняется ПОБОЧНЫМ
  // ЭФФЕКТОМ по мере размещения каждого кластера) для nudgeCluster —
  // единственного узкого примитива локального сдвига, заменяющего
  // collision.ts::cascadeShift целиком.
  const registry = new RowRegistry();
  const ownerByPerson = new Map<string, string>();
  const placer = {
    setPosition,
    isPlaced: (personId: string) => placedPersons.has(personId),
    placeDescendantBranches,
    slotAnchorX,
  };
  let frontier: FrontierEntry[] = collectAncestorFrontier(
    graph,
    graph.focusPersonId,
    positionByPerson.get(graph.focusPersonId)!.x,
    0,
  );
  while (frontier.length > 0) {
    frontier = placeAncestorGeneration(
      frontier,
      graph,
      positionByPerson,
      ownerByPerson,
      registry,
      placer,
      GENERATION_GAP,
    );
  }

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
}
