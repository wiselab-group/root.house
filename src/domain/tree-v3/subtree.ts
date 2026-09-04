import type { NormalizedGraph } from "./types";

/**
 * tree-v3 — bottom-up измерение ширины поддеревьев (§12/§27), ДО размещения
 * (placement.ts читает эти числа, а не пересчитывает их по ходу с push'ами,
 * как это делал tree-v2/layout.ts — см. анализ в начале задачи: place-then-push
 * был источником регрессий).
 *
 * Ключевая модель — "PersonUnit": РОВНО одна карточка на человека (§17), но
 * человек может иметь НЕСКОЛЬКО партнёрств (§19/§20 ремарьяж). Каждое его
 * партнёрство рисуется как отдельная под-ветка со своим junction и своими
 * детьми (§21), расходящаяся от одной и той же карточки человека. "Solo"
 * дети (родитель без зафиксированной пары в этом графе) — ещё одна такая
 * же под-ветка, без второго члена партнёрства.
 */

export const CARD_WIDTH = 176;
/** Горизонтальный зазор край-в-край между двумя НЕ связанными соседними карточками одного поколения (сиблинги, разные партнёрства). */
export const SIBLING_GAP = 64;
/** Зазор край-в-край между супругами внутри одного partnership — уже, чем SIBLING_GAP, чтобы "пара" визуально читалась плотнее соседей. */
export const SPOUSE_GAP = 32;
/** Зазор между двумя разными партнёрствами ОДНОГО И ТОГО ЖЕ человека (§19/§20) — шире SPOUSE_GAP (это не одна пара), но добавляется ПОВЕРХ карточки самого человека, а не двух отдельных карточек. */
export const REMARRIAGE_GAP = 56;

/**
 * Каждый узел обхода — конкретный человек (ровно одна карточка, §17). Его
 * "под-ветки" — партнёрства (0..N) и/или "solo"-дети без партнёрства.
 */
export interface PersonUnit {
  personId: string;
}

export function unitKeyId(unit: PersonUnit): string {
  return unit.personId;
}

/** Одна под-ветка человека: либо конкретный Partnership (супруг + общие дети), либо "solo" (собственные дети без зафиксированной пары). */
export type Branch =
  | {
      type: "partnership";
      partnershipId: string;
      spouseId: string;
      childrenIds: string[];
    }
  | { type: "solo"; childrenIds: string[] };

export function branchesOf(graph: NormalizedGraph, personId: string): Branch[] {
  const branches: Branch[] = [];
  const person = graph.personById.get(personId);
  for (const partnershipId of person?.partnershipIds ?? []) {
    const partnership = graph.partnershipById.get(partnershipId)!;
    const spouseId =
      partnership.leftPersonId === personId
        ? partnership.rightPersonId
        : partnership.leftPersonId;
    branches.push({
      type: "partnership",
      partnershipId,
      spouseId,
      childrenIds: partnership.childrenIds,
    });
  }
  const solo = graph.soloParentByPersonId.get(personId);
  if (solo && solo.childrenIds.length > 0) {
    branches.push({ type: "solo", childrenIds: solo.childrenIds });
  }
  return branches;
}

/**
 * Ширина поддерева ПОТОМКОВ человека `personId` (§12): own card width, ИЛИ
 * (если шире) сумма ширин всех его branch-поддеревьев + зазоры между ними.
 * Каждая branch-поддерево, в свою очередь — своя карточка супруга (если
 * partnership) + ширина её собственных детей.
 *
 * ВАЖНО: считает только "вниз" от personId — если personId сам стоит внутри
 * чьего-то partnership (например, он ребёнок в родительской паре), ширина
 * ЭТОЙ пары как объединённого юнита считается в placement.ts отдельно
 * (unionWidth), не здесь — здесь всегда "сколько места нужно ПОД одним
 * конкретным человеком и его собственными партнёрствами".
 */
export function measurePersonDescendantWidth(
  graph: NormalizedGraph,
  personId: string,
  cache: Map<string, number> = new Map(),
): number {
  const cached = cache.get(personId);
  if (cached !== undefined) return cached;

  const branches = branchesOf(graph, personId);
  if (branches.length === 0) {
    cache.set(personId, CARD_WIDTH);
    return CARD_WIDTH;
  }

  const branchWidths = branches.map((branch) =>
    measureBranchWidth(graph, branch, cache),
  );
  const total =
    branchWidths.reduce((sum, w) => sum + w, 0) +
    REMARRIAGE_GAP * Math.max(0, branches.length - 1);

  const width = Math.max(CARD_WIDTH, total);
  cache.set(personId, width);
  return width;
}

/** Ширина одной под-ветки (partnership или solo): own unit width (1 или 2 карточки) ИЛИ ширина суммы детей, что больше. */
function measureBranchWidth(
  graph: NormalizedGraph,
  branch: Branch,
  cache: Map<string, number>,
): number {
  const ownWidth =
    branch.type === "partnership" ? CARD_WIDTH * 2 + SPOUSE_GAP : CARD_WIDTH;

  if (branch.childrenIds.length === 0) return ownWidth;

  const childKeys = uniqueChildren(branch.childrenIds);
  const childWidths = childKeys.map((childId) =>
    measurePersonDescendantWidth(graph, childId, cache),
  );
  const childrenTotal =
    childWidths.reduce((sum, w) => sum + w, 0) +
    SIBLING_GAP * Math.max(0, childKeys.length - 1);

  return Math.max(ownWidth, childrenTotal);
}

function uniqueChildren(childrenIds: string[]): string[] {
  return [...new Set(childrenIds)];
}
