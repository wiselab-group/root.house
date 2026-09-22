"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  updatePlaceAction,
  type PlaceFormState,
} from "@/actions/place.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlaceGeocodeCombobox } from "./place-geocode-combobox";
import type { GeocodeResult } from "@/lib/maptiler-geocode";
import type { PlaceRecord } from "@/domain/place/place.service";

const initialState: PlaceFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Сохраняем…" : "Сохранить"}
    </Button>
  );
}

/**
 * In-place edit dialog for a PlacesList row — same Dialog-per-row pattern as
 * TimelineRow's date dialogs (person-date-dialog-content.tsx), chosen over a
 * standalone /places/[id]/edit route because PlacesList's own doc comment
 * establishes Place as deliberately having "no detail page of its own to
 * navigate to."
 */
export function EditPlaceDialogContent({
  familyId,
  place,
  onOpenChange,
}: {
  familyId: string;
  place: PlaceRecord;
  onOpenChange: (open: boolean) => void;
}) {
  const boundAction = updatePlaceAction.bind(null, familyId, place.id);
  const [state, formAction] = useActionState(boundAction, initialState);
  const submittedRef = useRef(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    place.latitude != null && place.longitude != null
      ? { lat: place.latitude, lng: place.longitude }
      : null,
  );

  useEffect(() => {
    if (!submittedRef.current) return;
    if (!state.error && !state.fieldErrors) onOpenChange(false);
  }, [state, onOpenChange]);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Редактировать место</DialogTitle>
      </DialogHeader>
      <form
        action={(formData) => {
          submittedRef.current = true;
          formAction(formData);
        }}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-1">
          <Label htmlFor="name" className="text-xs text-muted-foreground">
            Название
          </Label>
          <Input id="name" name="name" defaultValue={place.name} required />
          {state.fieldErrors?.name && (
            <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="region" className="text-xs text-muted-foreground">
              Регион
            </Label>
            <Input
              id="region"
              name="region"
              defaultValue={place.region ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="country" className="text-xs text-muted-foreground">
              Страна
            </Label>
            <Input
              id="country"
              name="country"
              defaultValue={place.country ?? ""}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label
            htmlFor="description"
            className="text-xs text-muted-foreground"
          >
            Описание
          </Label>
          <Textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={place.description ?? ""}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">
            Точка на карте (необязательно)
          </Label>
          <PlaceGeocodeCombobox
            defaultLabel={
              coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : ""
            }
            onSelect={(result: GeocodeResult) =>
              setCoords({ lat: result.latitude, lng: result.longitude })
            }
          />
          {coords && (
            <p className="text-xs text-muted-foreground">
              {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </p>
          )}
          <input type="hidden" name="latitude" value={coords?.lat ?? ""} />
          <input type="hidden" name="longitude" value={coords?.lng ?? ""} />
          {state.fieldErrors?.latitude && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.latitude}
            </p>
          )}
        </div>

        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <SubmitButton />
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
