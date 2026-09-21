"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  addRelativeAction,
  type RelationshipFormState,
} from "@/actions/relationship.actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { PersonRecord } from "@/domain/person/person.service";
import { personDisplayName } from "@/domain/person/display-name";
import { useCollapsibleFormClose } from "./collapsible-form";
import { PersonDateFields } from "./person-date-fields";

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
 *
 * `kind` is chosen by the caller (AddRelativePanel's tabs), not inside this
 * form — so the form itself carries no heading/label of its own; the tab
 * already says "Родитель"/"Супруг"/"Ребёнок" one level up, and repeating
 * that as a form title would be the same word twice in a row.
 */
export function AddRelativeForm({
  familyId,
  personId,
  kind,
  candidates,
  submitLabel,
}: {
  familyId: string;
  personId: string;
  kind: "parent" | "child" | "spouse";
  candidates: PersonRecord[];
  submitLabel: string;
}) {
  const close = useCollapsibleFormClose();
  const [mode, setMode] = useState<"existing" | "new">(
    candidates.length > 0 ? "existing" : "new",
  );
  const boundAction = (state: RelationshipFormState, formData: FormData) =>
    addRelativeAction(familyId, personId, kind, state, formData);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
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
        <NativeSelect name="existingPersonId" required>
          <option value="">Выберите человека…</option>
          {candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {personDisplayName(candidate)}
              {candidate.birthDate?.year
                ? ` (${candidate.birthDate.year})`
                : ""}
            </option>
          ))}
        </NativeSelect>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
            <Checkbox name="isPlaceholder" />
            Имя неизвестно — создать запись-заглушку
          </label>
        </div>
      )}

      {kind === "spouse" && (
        <PersonDateFields
          prefix="startDate"
          legend="Дата начала отношений (необязательно)"
        />
      )}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-2">
        <SubmitButton label={submitLabel} />
        <Button type="button" variant="ghost" size="sm" onClick={close}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
