"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createEventAction, type EventFormState } from "@/actions/event.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonDateFields } from "./person-date-fields";
import { EVENT_TYPE_LABELS } from "@/domain/event/event-roles";

const initialState: EventFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
      {pending ? "Добавляем…" : "Добавить событие"}
    </Button>
  );
}

export function AddEventForm({ familyId, personId }: { familyId: string; personId: string }) {
  const boundAction = createEventAction.bind(null, familyId, personId);
  const [state, formAction] = useActionState(boundAction, initialState);
  const [showRange, setShowRange] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border border-border p-3">
      <p className="text-sm font-medium">Добавить событие</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="type" className="text-xs text-muted-foreground">
            Тип
          </Label>
          <select
            id="type"
            name="type"
            defaultValue="other"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="title" className="text-xs text-muted-foreground">
            Название
          </Label>
          <Input id="title" name="title" required />
        </div>
      </div>

      <PersonDateFields prefix="date" legend="Дата" />

      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={showRange}
          onChange={(e) => setShowRange(e.target.checked)}
          className="size-4"
        />
        Есть дата окончания (например, военная служба)
      </label>
      {showRange && <PersonDateFields prefix="endDate" legend="Дата окончания" />}

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
      {state.fieldErrors &&
        Object.entries(state.fieldErrors).map(([field, message]) => (
          <p key={field} className="text-sm text-destructive">
            {message}
          </p>
        ))}

      <SubmitButton />
    </form>
  );
}
