"use client";

import { useState, useTransition } from "react";
import { deletePersonAction } from "@/actions/person.actions";
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

/**
 * Deleting a Person is destructive and cascades (relationships, event
 * participation, media links — see db/schema cascade policy in
 * docs/architecture.md), so it always goes through an explicit confirm
 * dialog rather than a bare button.
 */
export function DeletePersonButton({
  familyId,
  personId,
  personName,
}: {
  familyId: string;
  personId: string;
  personName: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await deletePersonAction(familyId, personId);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>Удалить</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить {personName}?</DialogTitle>
          <DialogDescription>
            Это действие нельзя отменить. Все связи с родственниками, события и привязанные фото
            для этого человека также будут удалены.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Отмена
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending} aria-busy={isPending}>
            {isPending ? "Удаляем…" : "Удалить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
