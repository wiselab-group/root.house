"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  createAlbumAction,
  type AlbumFormState,
} from "@/actions/album.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: AlbumFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Создаём…" : "Создать альбом"}
    </Button>
  );
}

/**
 * New-album form — lives inside the "+ Новый альбом" Dialog opened from
 * AlbumGrid's own create tile (not a CollapsibleForm card anymore: creating
 * an album is a structural action that belongs with the albums it creates,
 * not bundled into the same page-bottom actions row as "upload a photo").
 * `onSuccess` fires once the action returns with no errors, closing the
 * dialog automatically — the caller doesn't have to inspect form state
 * itself to know when to close. `onCancel` wires the dialog's own Cancel
 * button; kept as an explicit prop (not read from context) since this no
 * longer has a CollapsibleForm ancestor to close.
 */
export function AlbumForm({
  familyId,
  onSuccess,
  onCancel,
}: {
  familyId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const boundAction = createAlbumAction.bind(null, familyId);
  const [state, formAction] = useActionState(boundAction, initialState);
  // Skips the very first render (initialState is also `{}` with no error) —
  // only a state update coming back from an actual submit should close the
  // dialog, not the form's initial mount.
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!submittedRef.current) return;
    if (!state.error && !state.fieldErrors) onSuccess?.();
  }, [state, onSuccess]);

  return (
    <form
      action={(formData) => {
        submittedRef.current = true;
        formAction(formData);
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Название</Label>
        <Input id="name" name="name" placeholder="Свадьба 1978" required />
        {state.fieldErrors?.name && (
          <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Описание (необязательно)</Label>
        <Textarea id="description" name="description" rows={2} />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Отмена
        </Button>
        <SubmitButton />
      </div>
    </form>
  );
}
