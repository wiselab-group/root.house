"use client";

import { useState, useTransition } from "react";
import {
  DownloadIcon,
  ImageIcon,
  MoreVerticalIcon,
  Trash2Icon,
} from "lucide-react";
import { deleteMediaAction } from "@/actions/media.actions";
import { setAlbumCoverAction } from "@/actions/album.actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeletePhotoDialog } from "./delete-photo-dialog";
import { PortraitMenuItem } from "./portrait-menu-item";
import { mediaDownloadUrl } from "@/lib/media-url";

/**
 * The «⋯» on a gallery photo tile (PhotoGrid), shown only in the grid's
 * «Упорядочить» mode and always visible there — a plain grid is for looking
 * (and a hover-revealed button never showed on a phone at all). Download
 * also lives in the lightbox for everyone. "Сделать обложкой альбома" only shows on an
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
  const downloadHref = mediaDownloadUrl(mediaId, familyId);
  const [confirmOpen, setConfirmOpen] = useState(false);
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
      <DropdownMenu>
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
          {portrait && (
            <PortraitMenuItem
              familyId={familyId}
              familySlug={familySlug}
              mediaId={mediaId}
              personId={portrait.personId}
              isCurrent={portrait.isCurrent}
            />
          )}
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

      <DeletePhotoDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleDelete}
        isPending={isPending}
      />
    </>
  );
}
