import type { FamilyGraph, LaidOutPartnership, LaidOutPerson, TreeLayoutResult } from "./types";
import { normalizeGraph } from "./graph";
import { placeGraph } from "./placement";
import { buildEdgeSpecs } from "./edges";
import {
  assertNoOverlaps,
  compactPaternalMaternalGap,
  resolveGrandparentSymmetry,
  resolveResidualOverlaps,
} from "./collision";

export { buildEdgeSpecs };
export type { EdgeSpecs, PartnershipEdgeSpec, ParentChildEdgeSpec } from "./edges";
export type { NormalizedGraph } from "./types";

/**
 * tree-v3 — единственная публичная точка входа в генеалогический layout-
 * пайплайн (§30/§45): normalize → measure (внутри placeGraph, bottom-up) →
 * place → validate geometry. Возвращает layout-независимый результат
 * (никакого React Flow здесь — см. react-flow-adapter.ts, §48).
 */
export function buildTreeV3Layout(
  graph: FamilyGraph,
  focusPersonId: string,
): TreeLayoutResult {
  const normalized = normalizeGraph(graph, focusPersonId);
  const { positionByPerson, junctionByPartnership } = placeGraph(normalized);

  // Родители фокуса-родителей (дедушки/бабушки) — если их "домашние",
  // центрированные над своим ребёнком позиции физически пересекаются на
  // общем Y, раздвигаем ОБЕ пары поровну (product feedback: "дерево Виктора
  // и Галины должны быть симметричными" — см. collision.ts::
  // resolveGrandparentSymmetry). ДО compactPaternalMaternalGap: та функция
  // компактит только СТРОГО ВЫШЕ поколения родителей фокуса и не трогает
  // именно эту пару.
  resolveGrandparentSymmetry(positionByPerson, normalized);

  // Стягиваем отцовскую/материнскую половины друг к другу (product feedback:
  // "должно быть всё компактно" — measure-then-place сам по себе оставляет
  // между независимо выросшими половинами произвольно большой зазор, см.
  // collision.ts::compactPaternalMaternalGap). Симметричная rigid-трансляция
  // вокруг x=0 — фокус (branch: "focus"/"descendant") не трогается, поэтому
  // ДО resolveResidualOverlaps/re-shift, а не после.
  compactPaternalMaternalGap(positionByPerson, normalized);

  // §25 — остаточные коллизии (независимые ветви генеалогии, сходящиеся на
  // одном Y не через общего предка в этом обходе) разрешаются сдвигом
  // минимальной единицы (карточка, либо карточка+супруг) — measure-then-place
  // сам по себе исключает коллизии ВНУТРИ одного family-обхода (§12), но не
  // между двумя независимыми обходами, которые ничего не знают друг о друге.
  resolveResidualOverlaps(positionByPerson, normalized);

  // Пересчитываем focus=x=0 (§6/§28) ПОСЛЕ resolution — sweep в
  // resolveResidualOverlaps мог сдвинуть фокус-персону, если её Y-группа
  // содержала коллизию левее неё (см. историю бага).
  const focusPosAfterResolve = positionByPerson.get(focusPersonId);
  if (focusPosAfterResolve && focusPosAfterResolve.x !== 0) {
    const reShiftX = -focusPosAfterResolve.x;
    for (const pos of positionByPerson.values()) pos.x += reShiftX;
  }

  // Junction-точки пересчитываются от ФАКТИЧЕСКИХ (после resolution) позиций
  // — resolveResidualOverlaps мог сдвинуть одного из партнёров.
  for (const [partnershipId, partnership] of normalized.partnershipById) {
    const leftPos = positionByPerson.get(partnership.leftPersonId);
    const rightPos = positionByPerson.get(partnership.rightPersonId);
    if (!leftPos || !rightPos) continue;
    junctionByPartnership.set(partnershipId, { x: (leftPos.x + rightPos.x) / 2, y: leftPos.y });
  }

  // §23 — постфактум геометрическая валидация, не "визуальная интуиция".
  // Бросает с деталями при коллизии — тесты (layout.test.ts) держат этот
  // инвариант зелёным на реальных данных и на каждом synthetic-кейсе.
  assertNoOverlaps(positionByPerson, normalized);

  const persons: LaidOutPerson[] = [...normalized.personById.values()].map((p) => {
    const pos = positionByPerson.get(p.id);
    if (!pos) {
      throw new Error(`buildTreeV3Layout: person "${p.id}" was not placed (unsupported graph shape) — §32`);
    }
    return { ...p, x: pos.x, y: pos.y };
  });

  const partnerships: LaidOutPartnership[] = [...normalized.partnershipById.values()].map((p) => {
    const junction = junctionByPartnership.get(p.id);
    return { ...p, x: junction?.x ?? 0, y: junction?.y ?? 0 };
  });

  return {
    persons,
    partnerships,
    relationships: normalized.relationships,
    focusPersonId,
  };
}
