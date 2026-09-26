"use client";

import { useOptimistic } from "react";
import { RelativeListItem } from "./relative-list-item";
import type { RelativeItem } from "./relative-item";
import type { RelationKind } from "@/domain/person/relation-label";

/** Generational reading order — each kind starts its own row. */
const KIND_ORDER: RelationKind[] = ["parent", "spouse", "child", "sibling"];

type RelativeAction =
  | { type: "remove"; personId: string }
  | { type: "toggleStatus"; personId: string; isCurrent: boolean };

/**
 * Deletion and status toggles are optimistic — RemoveRelationshipButton and
 * PartnershipStatusToggle (via RelativeListItem) call these reducer actions
 * inside their own startTransition, so the row disappears (or its
 * «бывшая жена» label flips) immediately on confirm instead of waiting for
 * the corresponding server action's revalidatePath round-trip.
 */
function relativesReducer(
  state: RelativeItem[],
  action: RelativeAction,
): RelativeItem[] {
  if (action.type === "remove") {
    return state.filter((person) => person.id !== action.personId);
  }
  return state.map((person) =>
    person.id === action.personId
      ? { ...person, isCurrent: action.isCurrent }
      : person,
  );
}

/**
 * The Person Profile's family list — two columns on wide screens, one on
 * phones. Split by kind (parents → spouses → children → siblings), each
 * kind starting a fresh row with a hairline between kinds (user request
 * 2026-09-26): in one continuous grid a mother and a husband shared a row
 * and the kinds ran together. No per-kind headings — those were tried and
 * replaced by this one list on user request; every row's own «мать» /
 * «бывший муж» label already names the relation.
 */
export function RelativeGroup({
  familyId,
  familySlug,
  personId,
  people,
  canEdit = false,
}: {
  familyId: string;
  familySlug: string;
  personId: string;
  people: RelativeItem[];
  canEdit?: boolean;
}) {
  const [optimisticPeople, dispatch] = useOptimistic(people, relativesReducer);
  const groups = KIND_ORDER.map((kind) =>
    optimisticPeople.filter((person) => person.relationKind === kind),
  ).filter((group) => group.length > 0);
  if (groups.length === 0) return null;

  return (
    <div className="flex flex-col divide-y divide-border/60">
      {groups.map((group) => (
        <ul
          key={group[0].relationKind}
          className="grid gap-2 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-2"
        >
          {group.map((person) => (
            <RelativeListItem
              key={`${person.relationshipId ?? "derived"}-${person.id}`}
              familyId={familyId}
              familySlug={familySlug}
              personId={personId}
              person={person}
              canEdit={canEdit}
              onRemove={() => dispatch({ type: "remove", personId: person.id })}
              onToggleStatus={(isCurrent) =>
                dispatch({
                  type: "toggleStatus",
                  personId: person.id,
                  isCurrent,
                })
              }
            />
          ))}
        </ul>
      ))}
    </div>
  );
}
