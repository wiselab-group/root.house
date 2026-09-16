"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  updateAlbumAction,
  type AlbumFormState,
} from "@/actions/album.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const initialState: AlbumFormState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Сохраняем…" : "Сохранить"}
    </Button>
  );
}

/**
 * Renames an album via a Dialog rather than swapping the page's own h1 for
 * an inline form — an earlier version did the latter (took over the h1's
 * spot in place), which kept the title readable without a modal on top of
 * it, but lost the title from view for the whole edit (nothing to compare
 * the in-progress name against) and needed a fair amount of layout code to
 * keep the surrounding header from jumping around while active. A modal
 * keeps the page underneath static and the flow matches every other
 * edit/confirm action in the app. Styled to match AlbumForm's own Dialog
 * (CreateAlbumTile's "Новый альбом") exactly — same plain flex-end footer
 * (no DialogFooter chrome), same ghost Cancel button, same
 * submittedRef-gated useEffect for closing on success — since the two
 * forms are close enough in shape (name + optional description) that any
 * divergence between them reads as inconsistency rather than intent.
 * AlbumPageHeader/AlbumActionsMenu control `open`.
 */
export function AlbumTitleEditor({
  familyId,
  albumId,
  defaultName,
  defaultDescription,
  open,
  onOpenChange,
}: {
  familyId: string;
  albumId: string;
  defaultName: string;
  defaultDescription: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const boundAction = updateAlbumAction.bind(null, familyId, albumId);
  const [state, formAction] = useActionState(boundAction, initialState);
  // Skips the very first render (initialState is also `{}` with no error) —
  // only a state update coming back from an actual submit should close the
  // dialog, not the form's initial mount.
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!submittedRef.current) return;
    if (!state.error && !state.fieldErrors) onOpenChange(false);
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Переименовать альбом</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) => {
            submittedRef.current = true;
            formAction(formData);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="album-title-name">Название</Label>
            <Input
              id="album-title-name"
              name="name"
              defaultValue={defaultName}
              required
              autoFocus
            />
            {state.fieldErrors?.name && (
              <p className="text-sm text-destructive">
                {state.fieldErrors.name}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="album-title-description">
              Описание (необязательно)
            </Label>
            <Textarea
              id="album-title-description"
              name="description"
              defaultValue={defaultDescription ?? undefined}
              rows={2}
            />
          </div>

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <SaveButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
