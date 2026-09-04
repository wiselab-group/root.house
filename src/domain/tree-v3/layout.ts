import type {
  FamilyGraph,
  LaidOutPartnership,
  LaidOutPerson,
  TreeLayoutResult,
} from "./types";
import { normalizeGraph } from "./graph";
import { placeGraph } from "./placement";
import { buildEdgeSpecs } from "./edges";
import { assertNoOverlaps } from "./collision";

export { buildEdgeSpecs };
export type {
  EdgeSpecs,
  PartnershipEdgeSpec,
  ParentChildEdgeSpec,
} from "./edges";
export type { NormalizedGraph } from "./types";

/**
 * tree-v3 — единственная публичная точка входа в генеалогический layout-
 * пайплайн (§30/§45): normalize → measure (внутри placeGraph, bottom-up) →
 * place → validate geometry. Возвращает layout-независимый результат
 * (никакого React Flow здесь — см. react-flow-adapter.ts, §48).
 *
 * §пересмотр архитектуры: раньше здесь было ЕЩЁ 3 последовательных
 * post-hoc прохода (resolveGrandparentSymmetry, compactPaternalMaternalGap,
 * resolveResidualOverlaps, collision.ts) — patch'и, компенсирующие
 * направленную слепоту старого ancestor-размещения (paternal-линия
 * полностью проходила рекурсию до конца, прежде чем maternal-линия вообще
 * начинала размещаться, см. историю). Новое размещение предков
 * (placement.ts::placeGraph → ancestor-placement.ts) уже разводит
 * несвязанные кластеры предков ВО ВРЕМЯ размещения, по одному ряду
 * поколения за раз — placeGraph теперь сразу производит финальные позиции,
 * без отдельных proходов сверху.
 */
export function buildTreeV3Layout(
  graph: FamilyGraph,
  focusPersonId: string,
): TreeLayoutResult {
  const normalized = normalizeGraph(graph, focusPersonId);
  const { positionByPerson, junctionByPartnership } = placeGraph(normalized);

  // §23 — постфактум геометрическая валидация, не "визуальная интуиция".
  // Бросает с деталями при коллизии — тесты (layout.test.ts) держат этот
  // инвариант зелёным на реальных данных и на каждом synthetic-кейсе.
  assertNoOverlaps(positionByPerson, normalized);

  const persons: LaidOutPerson[] = [...normalized.personById.values()].map(
    (p) => {
      const pos = positionByPerson.get(p.id);
      if (!pos) {
        throw new Error(
          `buildTreeV3Layout: person "${p.id}" was not placed (unsupported graph shape) — §32`,
        );
      }
      return { ...p, x: pos.x, y: pos.y };
    },
  );

  const partnerships: LaidOutPartnership[] = [
    ...normalized.partnershipById.values(),
  ].map((p) => {
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
