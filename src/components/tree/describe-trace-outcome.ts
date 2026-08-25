import type { RelationshipPathOutcome } from "@/domain/relationship/genealogy-algorithms";

/**
 * Human-readable Russian label for a findRelationshipPath() outcome, shown
 * on TreeToolbar's trace badge. Split out from tree-toolbar.tsx purely to
 * keep that file under the 150-line component limit — this is pure display
 * formatting, no genealogy logic of its own.
 */
export function describeTraceOutcome(outcome: RelationshipPathOutcome | null): string | null {
  if (!outcome) return null;
  if (outcome.status !== "found") {
    return outcome.status === "insufficient_data" ? "Недостаточно данных" : "Родство не найдено";
  }
  if (outcome.relationship.label === "same person") return "Один и тот же человек";
  return RELATIONSHIP_LABELS[outcome.relationship.label] ?? outcome.relationship.label;
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  parent: "Родитель",
  child: "Ребёнок",
  sibling: "Брат/сестра",
  grandparent: "Дедушка/бабушка",
  grandchild: "Внук/внучка",
  aunt_or_uncle: "Тётя/дядя",
  niece_or_nephew: "Племянник/племянница",
  cousin: "Кузен/кузина",
  spouse: "Супруг/супруга",
  unrelated: "Родство не найдено",
};
