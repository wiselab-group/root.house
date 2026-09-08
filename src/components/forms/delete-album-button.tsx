"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { deleteAlbumAction } from "@/actions/album.actions";
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
 * Deletes the album itself (never its photos — see deleteAlbumAction's doc
 * comment). Navigates back to /photos afterward since the current
 * /photos/[albumId] page stops existing once the album is gone. Icon-only
 * trigger — pairs with RenameAlbumButton next to the album's own title
 * instead of living as a full-width button in the page footer.
 */
export function DeleteAlbumButton({
  familyId,
  familySlug,
  albumId,
  albumName,
}: {
  familyId: string;
  familySlug: string;
  albumId: string;
  albumName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await deleteAlbumAction(familyId, albumId);
      router.push(`/families/${familySlug}/photos`);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Удалить альбом"
            className="rounded-full text-muted-foreground hover:text-destructive"
          />
        }
      >
        <Trash2Icon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить альбом «{albumName}»?</DialogTitle>
          <DialogDescription>
            Это действие нельзя отменить. Сами фото останутся в семейной галерее
            — удаляется только альбом.
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
            {isPending ? "Удаляем…" : "Удалить альбом"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
