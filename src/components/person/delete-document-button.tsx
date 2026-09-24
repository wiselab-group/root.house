"use client";

import { useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { deleteMediaAction } from "@/actions/media.actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Same confirm-dialog + optimistic-removal shape as DeleteStoryButton —
 *  deleteMediaAction itself is already kind-agnostic (see its own doc
 *  comment), so this just wires up the document list's own onDeleted. */
export function DeleteDocumentButton({
  familyId,
  familySlug,
  mediaId,
  onDeleted,
}: {
  familyId: string;
  familySlug: string;
  mediaId: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      onDeleted();
      setOpen(false);
      await deleteMediaAction(familyId, familySlug, mediaId);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            aria-label="Удалить документ"
          />
        }
      >
        <Trash2Icon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить этот документ?</DialogTitle>
          <DialogDescription>Это действие нельзя отменить.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? "Удаляем…" : "Удалить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
