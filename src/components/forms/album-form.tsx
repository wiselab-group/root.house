"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createAlbumAction,
  type AlbumFormState,
} from "@/actions/album.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollapsibleFormClose } from "./collapsible-form";

const initialState: AlbumFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
      {pending ? "Создаём…" : "Создать альбом"}
    </Button>
  );
}

/**
 * New-album form — always offers Cancel via the ambient CollapsibleForm
 * close (opening this is never a one-way door). Renaming an existing album
 * is a separate, lighter inline editor (AlbumTitleEditor) that takes over
 * the album's own title instead of duplicating it in a form card.
 */
export function AlbumForm({ familyId }: { familyId: string }) {
  const close = useCollapsibleFormClose();
  const boundAction = createAlbumAction.bind(null, familyId);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-md border border-border p-3"
    >
      <p className="text-sm font-medium">Новый альбом</p>

      <div className="flex flex-col gap-1">
        <Label htmlFor="name" className="text-xs text-muted-foreground">
          Название
        </Label>
        <Input id="name" name="name" placeholder="Свадьба 1978" required />
        {state.fieldErrors?.name && (
          <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
        )}
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

      <div className="flex gap-2">
        <SubmitButton />
        <Button type="button" variant="ghost" size="sm" onClick={close}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
