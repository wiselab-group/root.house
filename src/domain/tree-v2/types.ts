/**
 * tree-v2 — минимальная доменная модель для чистовой переработки layout'а
 * семейного дерева. Изолирована от src/domain/tree и src/domain/person:
 * никакого импорта БД, никакой связи со старым tree-layout.builder.ts.
 *
 * Граф остаётся тем же по духу, что и боевая модель (Person + Relationship),
 * но упрощён до полей, реально нужных для layout-экспериментов.
 */

export type Gender = "male" | "female" | "unknown";

export interface PersonNodeData extends Record<string, unknown> {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
}

export type RelationshipKind = "spouse" | "parent-child";

export interface RelationshipEdgeData {
  id: string;
  kind: RelationshipKind;
  /** parent-child: from = родитель, to = ребёнок. spouse: порядок не важен. */
  from: string;
  to: string;
}

export interface FamilyGraph {
  persons: PersonNodeData[];
  relationships: RelationshipEdgeData[];
}

/** Результат layout-прохода: позиции узлов, готовые для передачи в xyflow. */
export interface LaidOutPerson extends PersonNodeData {
  x: number;
  y: number;
}

export interface TreeLayoutResult {
  persons: LaidOutPerson[];
  relationships: RelationshipEdgeData[];
}
