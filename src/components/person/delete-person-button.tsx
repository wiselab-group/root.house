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
  className,
  open: controlledOpen,
  onOpenChange,
  trigger = true,
}: {
  familyId: string;
  personId: string;
  personName: string;
  className?: string;
  /** Controlled mode — for opening this confirm dialog from elsewhere (the
   *  hero's «⋮» menu), with `trigger={false}` to render no button of its own. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: boolean;
}) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = controlledOpen ?? ownOpen;
  const setOpen = onOpenChange ?? setOwnOpen;
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await deletePersonAction(familyId, personId);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger
          render={
            <Button variant="destructive" size="sm" className={className} />
          }
        >
          Удалить
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить {personName}?</DialogTitle>
          <DialogDescription>
            Это действие нельзя отменить. Все связи с родственниками, события и
            привязанные фото для этого человека также будут удалены.
          </DialogDescription>
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
