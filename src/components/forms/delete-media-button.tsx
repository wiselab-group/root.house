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

/**
 * Small overlay control on a gallery photo. Uses a trash icon (not an X) so
 * it's never confused with a nearby close button — PhotoLightbox renders
 * this right next to its own X close control. Gated behind a confirm dialog
 * like every other delete action, since a misclick on a gallery grid is easy.
 */
export function DeleteMediaButton({
  familyId,
  familySlug,
  mediaId,
  personId,
}: {
  familyId: string;
  familySlug: string;
  mediaId: string;
  /** Pass when deleting from a specific person's profile gallery — omit on the family-wide gallery, where a photo may be untagged or tagged to several people. */
  personId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await deleteMediaAction(familyId, familySlug, mediaId, personId);
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="secondary"
            size="icon-xs"
            aria-label="Удалить фото"
            className="rounded-full shadow-sm"
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
