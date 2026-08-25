import type { PartialDate } from "@/domain/shared/partial-date";
import type { GenealogyGraph } from "./genealogy-graph";
import { getParents } from "./genealogy-algorithms";

/**
 * genealogy-validation.ts — whole-graph consistency checks over an already-
 * built GenealogyGraph. Deliberately separate from relationship.service.ts's
 * validateParentChild/validatePartnership, which are pre-insert gatekeepers
 * (block a single proposed edge before it's written). This module instead
 * scans a graph that may already contain imperfect data (a GEDCOM import, an
 * older row predating a validation rule, ...) and reports issues — it never
 * throws and never mutates anything, so callers decide what to do with the
 * findings (surface a warning banner, flag a person for review, ...).
 *
 * Per the plan's §6: real genealogical data is routinely incomplete,
 * approximate, or contradictory ("born ~1920", unknown parent). This module
 * flags only genuinely structural problems (a person who is their own
 * ancestor, a duplicated edge, a self-partnership that slipped through) as
 * `error`, and flags merely-suspicious-but-possible situations (a child
 * apparently older than their parent) as `warning` — never hard-blocks on
 * data that's simply incomplete.
 */

export type GenealogyIssueSeverity = "error" | "warning";

export type GenealogyIssueKind =
  | "self_parent_cycle"
  | "duplicate_parent_child"
  | "duplicate_partnership"
  | "self_partnership"
  | "child_older_than_parent"
  | "parent_too_young"
  | "death_before_birth";

export interface GenealogyIssue {
  kind: GenealogyIssueKind;
  severity: GenealogyIssueSeverity;
  message: string;
  personIds: string[];
}

const MIN_PLAUSIBLE_PARENT_AGE = 12; // biologically implausible below this, but not impossible for adoptive/step — kept a warning, not an error

/**
 * Detects a cycle reachable from `startId` by walking parentEdgesOf — i.e.
 * whether `startId` is (transitively) its own ancestor. Used here to flag
 * cycles that predate the insert-time cycle check (imported data, manual DB
 * edits) rather than to gate new writes (relationship.service.ts already
 * does that on insert).
 */
function findCycleFrom(graph: GenealogyGraph, startId: string): string[] | null {
  const visited = new Set<string>();
  const stack: string[] = [];

  function visit(personId: string): string[] | null {
    if (stack.includes(personId)) {
      return [...stack.slice(stack.indexOf(personId)), personId];
    }
    if (visited.has(personId)) return null;
    visited.add(personId);
    stack.push(personId);
    for (const edge of graph.parentEdgesOf.get(personId) ?? []) {
      const found = visit(edge.parentId);
      if (found) return found;
    }
    stack.pop();
    return null;
  }

  return visit(startId);
}

function yearOf(date: PartialDate | null): number | null {
  return date?.year ?? null;
}

/**
 * Scans the whole graph for structural genealogical problems. Cheap enough
 * to run over a full family (hundreds/low-thousands of people) — each check
 * is a single pass over persons or edges, no repeated traversal per person
 * except the cycle check, which is capped by `visited` de-duplication across
 * calls.
 */
export function validateGenealogyGraph(graph: GenealogyGraph): GenealogyIssue[] {
  const issues: GenealogyIssue[] = [];

  // --- Structural errors -----------------------------------------------

  const cycleChecked = new Set<string>();
  for (const personId of graph.personsById.keys()) {
    if (cycleChecked.has(personId)) continue;
    const cycle = findCycleFrom(graph, personId);
    if (cycle) {
      for (const id of cycle) cycleChecked.add(id);
      issues.push({
        kind: "self_parent_cycle",
        severity: "error",
        message: "Обнаружен цикл в родословной: человек является собственным предком.",
        personIds: cycle,
      });
    } else {
      cycleChecked.add(personId);
    }
  }

  const seenParentChild = new Set<string>();
  for (const edges of graph.parentEdgesOf.values()) {
    for (const edge of edges) {
      const key = `${edge.parentId}->${edge.childId}`;
      if (seenParentChild.has(key)) {
        issues.push({
          kind: "duplicate_parent_child",
          severity: "error",
          message: "Найдена дублирующаяся родительская связь между двумя людьми.",
          personIds: [edge.parentId, edge.childId],
        });
      }
      seenParentChild.add(key);
    }
  }

  const seenPartnership = new Set<string>();
  for (const edges of graph.partnershipEdgesOf.values()) {
    for (const edge of edges) {
      if (edge.person1Id === edge.person2Id) {
        issues.push({
          kind: "self_partnership",
          severity: "error",
          message: "Человек не может состоять в партнёрстве сам с собой.",
          personIds: [edge.person1Id],
        });
        continue;
      }
      // Dedupe by edge id, not by pair — a divorced-then-remarried couple
      // legitimately has multiple partnership rows for the same pair.
      if (seenPartnership.has(edge.id)) continue;
      seenPartnership.add(edge.id);
    }
  }

  // --- Date plausibility warnings (never blocking) -----------------------

  for (const [childId, person] of graph.personsById) {
    const childBirthYear = yearOf(person.birthDate);
    if (childBirthYear === null) continue;

    for (const { person: parent } of getParents(graph, childId)) {
      const parentBirthYear = yearOf(parent.birthDate);
      if (parentBirthYear === null) continue;

      if (childBirthYear <= parentBirthYear) {
        issues.push({
          kind: "child_older_than_parent",
          severity: "warning",
          message: "Дата рождения ребёнка не позже даты рождения родителя — стоит перепроверить даты.",
          personIds: [parent.id, childId],
        });
      } else if (childBirthYear - parentBirthYear < MIN_PLAUSIBLE_PARENT_AGE) {
        issues.push({
          kind: "parent_too_young",
          severity: "warning",
          message: `Родителю было менее ${MIN_PLAUSIBLE_PARENT_AGE} лет на момент рождения ребёнка — возможна ошибка в датах.`,
          personIds: [parent.id, childId],
        });
      }
    }
  }

  for (const [personId, person] of graph.personsById) {
    const birthYear = yearOf(person.birthDate);
    const deathYear = yearOf(person.deathDate);
    if (birthYear !== null && deathYear !== null && deathYear < birthYear) {
      issues.push({
        kind: "death_before_birth",
        severity: "warning",
        message: "Дата смерти раньше даты рождения — стоит перепроверить даты.",
        personIds: [personId],
      });
    }
  }

  return issues;
}
