import { DeletePlaceButton } from "@/components/forms/delete-place-button";
import type { PlaceRecord } from "@/domain/place/place.service";

/**
 * Places' own archive-list — same "divide-y, not a Card per row" treatment
 * as PeopleList/the /families list (see their doc comments), minus the
 * ArrowRight/Link affordance: a place has no detail page of its own to
 * navigate to, so each row is a static row with an inline delete action
 * instead of a whole-row link.
 */
export function PlacesList({
  familyId,
  places,
  canEdit,
}: {
  familyId: string;
  places: PlaceRecord[];
  canEdit: boolean;
}) {
  return (
    <ul className="flex flex-col divide-y divide-border border-y border-border">
      {places.map((place, index) => (
        <li
          key={place.id}
          className="animate-content-enter flex items-start justify-between gap-4 py-4"
          style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
        >
          <div className="flex min-w-0 flex-col gap-1">
            <span className="font-heading text-lg font-medium">
              {place.name}
            </span>
            {(place.region || place.country) && (
              <span className="text-sm text-muted-foreground">
                {[place.region, place.country].filter(Boolean).join(", ")}
              </span>
            )}
            {place.description && (
              <p className="text-sm text-muted-foreground">
                {place.description}
              </p>
            )}
          </div>
          {canEdit && (
            <DeletePlaceButton familyId={familyId} placeId={place.id} />
          )}
        </li>
      ))}
    </ul>
  );
}
