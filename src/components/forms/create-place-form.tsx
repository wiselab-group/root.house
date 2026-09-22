"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createPlaceAction,
  type PlaceFormState,
} from "@/actions/place.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlaceGeocodeCombobox } from "./place-geocode-combobox";
import type { GeocodeResult } from "@/lib/maptiler-geocode";
import { useCollapsibleFormClose } from "./collapsible-form";

const initialState: PlaceFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
      {pending ? "Добавляем…" : "Добавить место"}
    </Button>
  );
}

export function CreatePlaceForm({ familyId }: { familyId: string }) {
  const close = useCollapsibleFormClose();
  const boundAction = createPlaceAction.bind(null, familyId);
  const [state, formAction] = useActionState(boundAction, initialState);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  // Closes the form back to its trigger on success — same fix as
  // AddEventForm/AddRelativeForm: createPlaceAction only revalidatePath()s
  // on success (no redirect), so without this the form stayed open with
  // stale inputs after the place was already added.
  const submittedRef = useRef(false);
  useEffect(() => {
    if (!submittedRef.current) return;
    if (!state.error && !state.fieldErrors) close();
  }, [state, close]);

  return (
    <form
      action={(formData) => {
        submittedRef.current = true;
        formAction(formData);
      }}
      className="flex flex-col gap-3 rounded-md border border-border p-3"
    >
      <p className="text-sm font-medium">Добавить место</p>

      <div className="flex flex-col gap-1">
        <Label htmlFor="name" className="text-xs text-muted-foreground">
          Название
        </Label>
        <Input id="name" name="name" placeholder="Таллин" required />
        {state.fieldErrors?.name && (
          <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="region" className="text-xs text-muted-foreground">
            Регион
          </Label>
          <Input id="region" name="region" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="country" className="text-xs text-muted-foreground">
            Страна
          </Label>
          <Input id="country" name="country" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="description" className="text-xs text-muted-foreground">
          Описание
        </Label>
        <Textarea id="description" name="description" rows={2} />
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">
          Точка на карте (необязательно)
        </Label>
        <PlaceGeocodeCombobox
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

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-2">
        <SubmitButton />
        <Button type="button" variant="ghost" size="sm" onClick={close}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
