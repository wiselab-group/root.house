"use client";

import { useActionState, useEffect, useRef } from "react";
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
import { PlaceLocationField } from "./place-location-field";
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

        <PlaceLocationField
          defaultPoint={
            place.latitude != null && place.longitude != null
              ? { latitude: place.latitude, longitude: place.longitude }
              : null
          }
          error={state.fieldErrors?.latitude}
        />

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
