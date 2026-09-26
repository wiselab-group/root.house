"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  addRelativeAction,
  type RelationshipFormState,
} from "@/actions/relationship.actions";
import { Button } from "@/components/ui/button";
import { PersonCombobox } from "@/components/tree/person-combobox";
import type { PersonRecord } from "@/domain/person/person.service";
import { useCollapsibleFormClose } from "./collapsible-form";
import { PersonDateFields } from "./person-date-fields";
import { NewRelativeFields } from "./new-relative-fields";
import { RelativeModeFields, type RelativeMode } from "./relative-mode-fields";

const initialState: RelationshipFormState = {};

function SubmitButton({
  label,
  disabled = false,
}: {
  label: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      disabled={pending || disabled}
      aria-busy={pending}
    >
      {pending ? "Добавляем…" : label}
    </Button>
  );
}

/**
 * Inline form for adding a parent/child/spouse to a Person — either by
 * finding an existing family member with search-as-you-type (the same
 * PersonCombobox as the tree's «Родство»: matches maiden names and typos,
 * shows life years — a plain <select> of everyone became unusable once a
 * family grew past a few dozen people), or by typing a new
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
  const [mode, setMode] = useState<RelativeMode>(
    candidates.length > 0 ? "existing" : "new",
  );
  const boundAction = (state: RelationshipFormState, formData: FormData) =>
    addRelativeAction(familyId, personId, kind, state, formData);
  const [state, formAction] = useActionState(boundAction, initialState);
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(
    null,
  );
  // Closes the form back to its trigger on success — same reasoning as
  // AddEventForm's identical fix: addRelativeAction only revalidatePath()s
  // on success (no redirect), so without this the form stayed open with
  // stale inputs after the relative was already added.
  const submittedRef = useRef(false);
  useEffect(() => {
    if (!submittedRef.current) return;
    if (!state.error) close();
  }, [state, close]);

  return (
    <form
      action={(formData) => {
        submittedRef.current = true;
        formAction(formData);
      }}
      className="flex flex-col gap-3"
    >
      <RelativeModeFields
        mode={mode}
        onModeChange={setMode}
        canPickExisting={candidates.length > 0}
      />

      {mode === "existing" ? (
        <>
          <PersonCombobox
            familyId={familyId}
            label="Кто это"
            value={picked}
            onChange={setPicked}
            excludeId={personId}
          />
          <input
            type="hidden"
            name="existingPersonId"
            value={picked?.id ?? ""}
          />
        </>
      ) : (
        <NewRelativeFields kind={kind} />
      )}

      {kind === "spouse" && (
        <PersonDateFields
          prefix="startDate"
          legend="Дата начала отношений (необязательно)"
        />
      )}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-2">
        <SubmitButton
          label={submitLabel}
          disabled={mode === "existing" && !picked}
        />
        <Button type="button" variant="ghost" size="sm" onClick={close}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
