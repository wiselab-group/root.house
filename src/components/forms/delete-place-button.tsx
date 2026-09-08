"use client";

import { useState, useTransition } from "react";
import { deletePlaceAction } from "@/actions/place.actions";
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

export function DeletePlaceButton({
  familyId,
  placeId,
}: {
  familyId: string;
  placeId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await deletePlaceAction(familyId, placeId);
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
          />
        }
      >
        Удалить
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить это место?</DialogTitle>
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
