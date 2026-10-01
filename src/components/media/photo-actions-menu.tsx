"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition, type ReactElement } from "react";
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
 * An editor's «⋯» actions for one gallery photo, in two places (user
 * request 2026-10-01): the lightbox's top bar (`trigger` — the only place
 * on a touch screen, where the grid shows bare photos) and the grid tile on
 * desktop, revealed on hover — see PhotoGridTile. Viewers get a plain
 * download button in the lightbox instead. "Сделать обложкой альбома" only
 * shows on an album's own page (albumId present), since a cover only makes
 * sense relative to one specific album. "Сделать портретом" (first item, by
 * user request) only shows in a Person's own gallery (`portrait` present).
 */
export function PhotoActionsMenu({
  familyId,
  familySlug,
  mediaId,
  albumId,
  portrait,
  onDeleted,
  trigger,
}: {
  familyId: string;
  familySlug: string;
  mediaId: string;
  albumId?: string | null;
  /** Present only in a Person's profile gallery — enables «Сделать портретом». */
  portrait?: { personId: string; isCurrent: boolean };
  /** Called inside the same transition as the delete action, before it resolves — lets PhotoGrid remove the tile from its optimistic list immediately instead of waiting for deleteMediaAction's revalidatePath. */
  onDeleted: () => void;
  /** The «⋯» button itself — defaults to the grid tile's round one. Gets
   *  its aria-label and icon from here. */
  trigger?: ReactElement;
}) {
  const tc = useTranslations("common");
  const t = useTranslations("media");
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
            trigger ?? (
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                className="rounded-full shadow-sm [&_svg]:size-4.5"
              />
            )
          }
          aria-label={t("photoActions")}
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
            {tc("download")}
          </DropdownMenuItem>
          {albumId && (
            <DropdownMenuItem onClick={handleSetCover} disabled={isPending}>
              <ImageIcon />
              {t("makeCover")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2Icon />
            {t("deletePhoto")}
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
