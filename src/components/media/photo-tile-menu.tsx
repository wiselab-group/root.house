"use client";

import { useState, useTransition } from "react";
import { ImageIcon, MoreVerticalIcon, Trash2Icon } from "lucide-react";
import { deleteMediaAction } from "@/actions/media.actions";
import { setAlbumCoverAction } from "@/actions/album.actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Hover-revealed overlay control on a gallery photo tile (PhotoGrid) —
 * replaces the old bare DeleteMediaButton with a menu once there's more
 * than one action available. "Сделать обложкой альбома" only shows on an
 * album's own page (albumId present), since a cover only makes sense
 * relative to one specific album.
 */
export function PhotoTileMenu({
  familyId,
  familySlug,
  mediaId,
  albumId,
  onDeleted,
}: {
  familyId: string;
  familySlug: string;
  mediaId: string;
  albumId?: string | null;
  /** Called inside the same transition as the delete action, before it resolves — lets PhotoGrid remove the tile from its optimistic list immediately instead of waiting for deleteMediaAction's revalidatePath. */
  onDeleted: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSetCover = () => {
    if (!albumId) return;
    startTransition(async () => {
      await setAlbumCoverAction(familyId, albumId, mediaId);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      onDeleted();
      setConfirmOpen(false);
      await deleteMediaAction(familyId, familySlug, mediaId);
    });
  };

  return (
    <>
      <div
        className={
          menuOpen
            ? "opacity-100"
            : "opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
        }
      >
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                aria-label="Действия с фото"
                className="rounded-full shadow-sm [&_svg]:size-4.5"
              />
            }
          >
            <MoreVerticalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 min-w-56">
            {albumId && (
              <DropdownMenuItem onClick={handleSetCover} disabled={isPending}>
                <ImageIcon />
                Сделать обложкой альбома
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2Icon />
              Удалить фото
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить фото?</DialogTitle>
            <DialogDescription>
              Это действие нельзя отменить. Фото будет удалено из всех альбомов
              и профилей, к которым оно привязано.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              aria-busy={isPending}
            >
              {isPending ? "Удаляем…" : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
