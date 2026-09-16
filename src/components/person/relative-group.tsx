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
 * inside their own startTransition, so the pill disappears (or its heart
 * icon flips) immediately on confirm instead of waiting for the
 * corresponding server action's revalidatePath round-trip.
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

export function RelativeGroup({
  familyId,
  familySlug,
  personId,
  title,
  people,
  relationshipKind,
  canEdit = false,
}: {
  familyId: string;
  familySlug: string;
  personId: string;
  title: string;
  people: RelativeItem[];
  relationshipKind?: "parent_child" | "partnership";
  canEdit?: boolean;
}) {
  const [optimisticPeople, dispatch] = useOptimistic(people, relativesReducer);

  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-sm font-medium text-muted-foreground">
        {title}
      </h3>
      {optimisticPeople.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {optimisticPeople.map((person) => (
            <RelativeListItem
              key={person.id}
              familyId={familyId}
              familySlug={familySlug}
              personId={personId}
              person={person}
              relationshipKind={relationshipKind}
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
      )}
    </div>
  );
}
