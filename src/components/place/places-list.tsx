"use client";

import { useOptimistic, useState } from "react";
import { PencilIcon } from "lucide-react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DeletePlaceButton } from "@/components/forms/delete-place-button";
import { EditPlaceDialogContent } from "@/components/forms/edit-place-dialog-content";
import type { PlaceRecord } from "@/domain/place/place.service";

/**
 * Places' own archive-list — same "divide-y, not a Card per row" treatment
 * as PeopleList/the /families list (see their doc comments), minus the
 * ArrowRight/Link affordance: a place has no detail page of its own to
 * navigate to, so editing happens in-place via a per-row Dialog
 * (EditPlaceDialogContent) rather than a navigate-away edit route — same
 * pattern PersonTimeline uses for its own synthetic rows.
 *
 * Deletion is optimistic — DeletePlaceButton calls onDeleted inside its own
 * startTransition, so the row disappears immediately on confirm instead of
 * waiting for deletePlaceAction's revalidatePath round-trip.
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
  const [optimisticPlaces, removeOptimisticPlace] = useOptimistic(
    places,
    (state, deletedPlaceId: string) =>
      state.filter((place) => place.id !== deletedPlaceId),
  );

  return (
    <ul className="flex flex-col divide-y divide-border border-y border-border">
      {optimisticPlaces.map((place, index) => (
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
            <div className="flex shrink-0 items-center gap-1">
              <EditPlaceRowButton familyId={familyId} place={place} />
              <DeletePlaceButton
                familyId={familyId}
                placeId={place.id}
                onDeleted={() => removeOptimisticPlace(place.id)}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function EditPlaceRowButton({
  familyId,
  place,
}: {
  familyId: string;
  place: PlaceRecord;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Редактировать «${place.name}»`}
          />
        }
      >
        <PencilIcon className="size-4" strokeWidth={1.75} />
      </DialogTrigger>
      <EditPlaceDialogContent
        familyId={familyId}
        place={place}
        onOpenChange={setOpen}
      />
    </Dialog>
  );
}
