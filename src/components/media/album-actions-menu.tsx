"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MoreVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { deleteAlbumAction } from "@/actions/album.actions";
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
 * Owner/editor-only actions for the currently open album — "Переименовать"
 * / "Удалить альбом" collapsed behind one `⋮` trigger next to the title,
 * same MoreVerticalIcon + DropdownMenu pattern as PhotoTileMenu on the
 * grid. Replaces two bare icon buttons (pencil, trash) that sat directly
 * next to the h1 — visual noise for actions used rarely, and one more
 * thing competing with the title itself for attention (user-requested
 * consolidation after seeing it live). Delete keeps its own confirm
 * dialog inline (same copy/flow as the former standalone
 * DeleteAlbumButton) since a destructive action needs that guard
 * regardless of where its trigger lives; rename just calls back into
 * AlbumPageHeader's own `editing` toggle — AlbumTitleEditor already owns
 * that whole flow, this only needs to turn it on.
 */
export function AlbumActionsMenu({
  familyId,
  familySlug,
  albumId,
  albumName,
  onRename,
}: {
  familyId: string;
  familySlug: string;
  albumId: string;
  albumName: string;
  onRename: () => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteAlbumAction(familyId, albumId);
      router.push(`/families/${familySlug}/photos`);
    });
  };

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Действия с альбомом"
              className="rounded-full text-muted-foreground hover:text-foreground"
            />
          }
        >
          <MoreVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 min-w-56">
          <DropdownMenuItem onClick={onRename}>
            <PencilIcon />
            Переименовать
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2Icon />
            Удалить альбом
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить альбом «{albumName}»?</DialogTitle>
            <DialogDescription>
              Это действие нельзя отменить. Сами фото останутся в семейной
              галерее — удаляется только альбом.
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
              {isPending ? "Удаляем…" : "Удалить альбом"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
