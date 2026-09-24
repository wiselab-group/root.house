"use client";

import { useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { deleteMediaAction } from "@/actions/media.actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
 * Small overlay control pinned to the top-right corner of a gallery photo
 * thumbnail (PhotoGrid) — destructive-red so it reads as delete at a
 * glance, distinct from any neutral control nearby. Gated behind a confirm
 * dialog like every other delete action, since a misclick on a gallery grid
 * is easy.
 */
export function DeleteMediaButton({
  familyId,
  familySlug,
  mediaId,
  className,
}: {
  familyId: string;
  familySlug: string;
  mediaId: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await deleteMediaAction(familyId, familySlug, mediaId);
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            aria-label="Удалить фото"
            className={cn("rounded-full shadow-sm [&_svg]:size-4.5", className)}
          />
        }
      >
        <Trash2Icon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить фото?</DialogTitle>
          <DialogDescription>
            Это действие нельзя отменить. Фото будет удалено из всех альбомов и
            профилей, к которым оно привязано.
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
