"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  addRelativeAction,
  type RelationshipFormState,
} from "@/actions/relationship.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PersonRecord } from "@/domain/person/person.service";
import { personDisplayName } from "@/domain/person/display-name";

const initialState: RelationshipFormState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
      {pending ? "Добавляем…" : label}
    </Button>
  );
}

/**
 * Inline form for adding a parent/child/spouse to a Person — either by
 * picking an existing family member from a dropdown, or by typing a new
 * name (optionally marking it a placeholder for "we don't know who this
 * is", e.g. an unnamed child or unknown parent).
 */
export function AddRelativeForm({
  familyId,
  personId,
  kind,
  candidates,
  label,
}: {
  familyId: string;
  personId: string;
  kind: "parent" | "child" | "spouse";
  candidates: PersonRecord[];
  label: string;
}) {
  const [mode, setMode] = useState<"existing" | "new">(
    candidates.length > 0 ? "existing" : "new",
  );
  const boundAction = (state: RelationshipFormState, formData: FormData) =>
    addRelativeAction(familyId, personId, kind, state, formData);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-md border border-border p-3"
    >
      <p className="text-sm font-medium">{label}</p>

      <div className="flex gap-3 text-sm">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="mode"
            checked={mode === "existing"}
            onChange={() => setMode("existing")}
            disabled={candidates.length === 0}
          />
          Уже есть в семье
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="mode"
            checked={mode === "new"}
            onChange={() => setMode("new")}
          />
          Новый человек
        </label>
      </div>

      {mode === "existing" ? (
        <select
          name="existingPersonId"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          required
        >
          <option value="">Выберите человека…</option>
          {candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {personDisplayName(candidate)}
              {candidate.birthDate?.year
                ? ` (${candidate.birthDate.year})`
                : ""}
            </option>
          ))}
        </select>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label
                htmlFor={`${kind}-newFirstName`}
                className="text-xs text-muted-foreground"
              >
                Имя
              </Label>
              <Input id={`${kind}-newFirstName`} name="newFirstName" />
            </div>
            <div className="flex flex-col gap-1">
              <Label
                htmlFor={`${kind}-newLastName`}
                className="text-xs text-muted-foreground"
              >
                Фамилия
              </Label>
              <Input id={`${kind}-newLastName`} name="newLastName" />
            </div>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" name="isPlaceholder" className="size-4" />
            Имя неизвестно — создать запись-заглушку
          </label>
        </div>
      )}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <SubmitButton label={label} />
    </form>
  );
}
