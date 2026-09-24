"use client";

import { useOptimistic } from "react";
import { RelativeListItem } from "./relative-list-item";
import type { RelativeItem } from "./relative-item";

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

/** The Person Profile's family list — two columns on wide screens, one on phones. */
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
  if (optimisticPeople.length === 0) return null;

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {optimisticPeople.map((person) => (
        <RelativeListItem
          key={`${person.relationshipId ?? "derived"}-${person.id}`}
          familyId={familyId}
          familySlug={familySlug}
          personId={personId}
          person={person}
          canEdit={canEdit}
          onRemove={() => dispatch({ type: "remove", personId: person.id })}
          onToggleStatus={(isCurrent) =>
            dispatch({ type: "toggleStatus", personId: person.id, isCurrent })
          }
        />
      ))}
    </ul>
  );
}
