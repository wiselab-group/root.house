/**
 * tree-v3 — доменные типы, полностью независимые от tree-v2/layout.ts и
 * tree-v2/types.ts (не импортируются оттуда). Форма входного графа (Person +
 * Relationship) намеренно похожа на tree-v2 — тот же дух, что и боевая модель
 * Person+Relationship (см. CLAUDE.md WHAT) — но это НЕ реэкспорт: если формы
 * когда-нибудь разойдутся, tree-v3 не должен молча сломаться.
 *
 * Только plain data — никакого React/xyflow здесь (см. `src/domain/**` НЕ
 * импортирует next/react, CLAUDE.md CODE RULES).
 */

export type Gender = "male" | "female" | "unknown";

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
}

export type RelationshipKind = "spouse" | "parent-child";

export interface Relationship {
  id: string;
  kind: RelationshipKind;
  /** parent-child: from = родитель, to = ребёнок. spouse: порядок не важен (см. graph.ts normalize — определяет left/right по gender). */
  from: string;
  to: string;
}

export interface FamilyGraph {
  persons: Person[];
  relationships: Relationship[];
}

// ---------------------------------------------------------------------------
// Normalized graph (см. graph.ts) — layout-специфичное представление,
// построенное ИЗ FamilyGraph, но не мутирующее исходные данные (§31).
// ---------------------------------------------------------------------------

/**
 * Partnership — технический layout-концепт (§16), НЕ обязан становиться
 * db-сущностью. Один per spouse-relationship (в отличие от tree-v2, где все
 * супруги одного человека схлопывались в один "unit") — так ремарьяж
 * (§19/§20) корректно даёт человеку НЕСКОЛЬКО partnership, каждый со своими
 * детьми, без дублирования персоны (§17).
 */
export interface Partnership {
  id: string;
  /** Пара person id, отсортированная husband-first (male < unknown < female) — §9. */
  leftPersonId: string;
  rightPersonId: string;
  /** id детей, рождённых именно в этой партнёрстве (§21) — пересечение parent-child от leftPersonId И rightPersonId к одному ребёнку, либо (если второй родитель неизвестен графу) просто дети одного из двух. */
  childrenIds: string[];
}

/**
 * Каждый Person также может иметь детей БЕЗ зафиксированного partnership
 * (второй родитель не в графе, или на layout вообще без пары) — такие дети
 * привязаны напрямую к persons, не к partnership. См. graph.ts childSource.
 */
export interface SoloParent {
  personId: string;
  childrenIds: string[];
}

export interface NormalizedPerson extends Person {
  /** BFS-расстояние поколений от фокус-персоны (0 = фокус, +1 = дети, -1 = родители) — СТРОГО soft hint для итогового Y (§14), не хардкод-константа. */
  generation: number;
  /** Все partnership.id, где этот person участвует. */
  partnershipIds: string[];
  /** parent-child "from": чьи это дети (person id родителей). */
  parentIds: string[];
  /** Направление ветки относительно фокуса: paternal (отцовская, растёт влево, §7), maternal (материнская, вправо, §8), либо "focus"/"descendant"/"unknown". Мягкая подсказка для layout, не жёсткая ось. */
  branch: "focus" | "paternal" | "maternal" | "descendant" | "unknown";
}

export interface NormalizedGraph {
  personById: Map<string, NormalizedPerson>;
  partnershipById: Map<string, Partnership>;
  soloParentByPersonId: Map<string, SoloParent>;
  /** Исходные relationships — сохраняются для edge-роутинга (divorce/статус и т.п. в будущем). */
  relationships: Relationship[];
  focusPersonId: string;
}

// ---------------------------------------------------------------------------
// Layout output — независим от React Flow (§48 адаптер отдельно).
// ---------------------------------------------------------------------------

export interface LayoutBox {
  /** Координаты ЦЕНТРА (не top-left — см. card-geometry.ts конвертацию в адаптере). */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LaidOutPerson extends NormalizedPerson {
  x: number;
  y: number;
}

export interface LaidOutPartnership extends Partnership {
  /** Точка соединения (junction) партнёрства — используется для T-образной линии к детям. */
  x: number;
  y: number;
}

export interface TreeLayoutResult {
  persons: LaidOutPerson[];
  partnerships: LaidOutPartnership[];
  relationships: Relationship[];
  focusPersonId: string;
}
