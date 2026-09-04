"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createPlaceAction,
  type PlaceFormState,
} from "@/actions/place.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const boundAction = createPlaceAction.bind(null, familyId);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form
      action={formAction}
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

      <div className="grid grid-cols-2 gap-3">
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
        <textarea
          id="description"
          name="description"
          rows={2}
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
