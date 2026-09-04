"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateFamilyDetailsAction,
  type UpdateFamilyDetailsFormState,
} from "@/actions/family.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FamilyRole } from "@/domain/family/roles";

const initialState: UpdateFamilyDetailsFormState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
      {pending ? "Сохраняем…" : "Сохранить"}
    </Button>
  );
}

/** Editable form half — mounted only while editing. On success the parent
 *  closes the form and re-renders with the saved values (no redirect here,
 *  unlike the slug editor, since neither field backs a URL). */
function DetailsEditForm({
  familyId,
  name,
  description,
  onSaved,
  onCancel,
}: {
  familyId: string;
  name: string;
  description: string;
  onSaved: (name: string, description: string) => void;
  onCancel: () => void;
}) {
  const boundAction = updateFamilyDetailsAction.bind(null, familyId);
  const [state, formAction] = useActionState(boundAction, initialState);
  const [nameValue, setNameValue] = useState(name);
  const [descriptionValue, setDescriptionValue] = useState(description);

  useEffect(() => {
    if (state.success) onSaved(nameValue, descriptionValue);
    // Only re-run when a fresh success arrives — nameValue/descriptionValue
    // are read at that moment, not tracked as effect dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="family-name" className="text-xs text-muted-foreground">
          Название семьи
        </Label>
        <Input
          id="family-name"
          name="name"
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          required
        />
        {state.fieldErrors?.name && (
          <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="family-description"
          className="text-xs text-muted-foreground"
        >
          Описание (необязательно)
        </Label>
        <Input
          id="family-description"
          name="description"
          type="text"
          value={descriptionValue}
          onChange={(e) => setDescriptionValue(e.target.value)}
          placeholder="Пара слов об архиве"
        />
        {state.fieldErrors?.description && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <SaveButton />
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Отмена
        </Button>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

/** Family name/description — visible to everyone, editable by any
 *  editor-or-above (unlike the slug, these are cosmetic fields and don't
 *  back any URL, so they don't need the owner-only bar). */
export function FamilyDetailsSettings({
  familyId,
  name: initialName,
  description: initialDescription,
  role,
}: {
  familyId: string;
  name: string;
  description: string;
  role: FamilyRole;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const canEdit = role === "editor" || role === "owner";

  if (editing) {
    return (
      <DetailsEditForm
        familyId={familyId}
        name={name}
        description={description}
        onSaved={(newName, newDescription) => {
          setName(newName);
          setDescription(newDescription);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-heading text-lg">{name}</span>
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
          >
            Изменить
          </Button>
        )}
      </div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
