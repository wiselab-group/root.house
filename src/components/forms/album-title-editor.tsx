"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateAlbumAction,
  type AlbumFormState,
} from "@/actions/album.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AlbumFormState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
      {pending ? "Сохраняем…" : "Сохранить"}
    </Button>
  );
}

/**
 * Renames an album in place of its own title — the input takes over the
 * h1's spot (same heading font/size) instead of opening a separate bordered
 * form card next to it, which used to duplicate the album name on screen
 * and push the rest of the page layout around. AlbumPageHeader toggles
 * this in for its pencil icon.
 */
export function AlbumTitleEditor({
  familyId,
  albumId,
  defaultName,
  defaultDescription,
  onCancel,
  onSaved,
}: {
  familyId: string;
  albumId: string;
  defaultName: string;
  defaultDescription: string | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const rawAction = updateAlbumAction.bind(null, familyId, albumId);
  // Only collapse back to plain text on a successful save — a validation/
  // server error must stay on screen with the fields still editable.
  const boundAction = async (
    state: AlbumFormState,
    formData: FormData,
  ): Promise<AlbumFormState> => {
    const result = await rawAction(state, formData);
    if (!result.error && !result.fieldErrors) onSaved();
    return result;
  };
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label
          htmlFor="album-title-name"
          className="text-xs text-muted-foreground"
        >
          Название
        </Label>
        <Input
          id="album-title-name"
          name="name"
          defaultValue={defaultName}
          required
          autoFocus
          className="font-heading h-auto rounded-md border border-input bg-transparent px-3 py-1.5 text-2xl font-medium shadow-none"
        />
        {state.fieldErrors?.name && (
          <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Label
          htmlFor="album-title-description"
          className="text-xs text-muted-foreground"
        >
          Описание
        </Label>
        <textarea
          id="album-title-description"
          name="description"
          defaultValue={defaultDescription ?? undefined}
          placeholder="Необязательно"
          rows={2}
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm text-muted-foreground"
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex gap-2">
        <SaveButton />
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
