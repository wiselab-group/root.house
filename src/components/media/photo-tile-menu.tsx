"use client";

import { useState, useTransition } from "react";
import {
  CheckIcon,
  DownloadIcon,
  ImageIcon,
  MoreVerticalIcon,
  Trash2Icon,
  UserRoundIcon,
} from "lucide-react";
import {
  deleteMediaAction,
  setPersonPortraitAction,
} from "@/actions/media.actions";
import { setAlbumCoverAction } from "@/actions/album.actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeletePhotoDialog } from "./delete-photo-dialog";

/**
 * Hover-revealed overlay control on a gallery photo tile (PhotoGrid) —
 * replaces the old bare DeleteMediaButton with a menu once there's more
 * than one action available. "Сделать обложкой альбома" only shows on an
 * album's own page (albumId present), since a cover only makes sense
 * relative to one specific album. "Сделать портретом" (first item, by user
 * request) only shows in a Person's own gallery (`portrait` present).
 */
export function PhotoTileMenu({
  familyId,
  familySlug,
  mediaId,
  albumId,
  portrait,
  onDeleted,
}: {
  familyId: string;
  familySlug: string;
  mediaId: string;
  albumId?: string | null;
  /** Present only in a Person's profile gallery — enables «Сделать портретом». */
  portrait?: { personId: string; isCurrent: boolean };
  /** Called inside the same transition as the delete action, before it resolves — lets PhotoGrid remove the tile from its optimistic list immediately instead of waiting for deleteMediaAction's revalidatePath. */
  onDeleted: () => void;
}) {
  const downloadHref = `/api/media/${mediaId}?familyId=${familyId}&download=1`;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSetCover = () => {
    if (!albumId) return;
    startTransition(async () => {
      await setAlbumCoverAction(familyId, albumId, mediaId);
    });
  };

  const handleSetPortrait = () => {
    if (!portrait) return;
    const { personId } = portrait;
    startTransition(async () => {
      await setPersonPortraitAction(familyId, familySlug, personId, mediaId);
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
            {portrait &&
              (portrait.isCurrent ? (
                <DropdownMenuItem disabled>
                  <CheckIcon />
                  Это портрет
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={handleSetPortrait}
                  disabled={isPending}
                >
                  <UserRoundIcon />
                  Сделать портретом
                </DropdownMenuItem>
              ))}
            <DropdownMenuItem render={<a href={downloadHref} download />}>
              <DownloadIcon />
              Скачать
            </DropdownMenuItem>
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

      <DeletePhotoDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleDelete}
        isPending={isPending}
      />
    </>
  );
}
