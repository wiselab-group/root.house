"use client";

import { useState } from "react";
import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlbumTitleEditor } from "@/components/forms/album-title-editor";
import { DeleteAlbumButton } from "@/components/forms/delete-album-button";

/**
 * Title row for /families/[slug]/photos and .../photos/[albumId] — plain
 * "Фото" + intro copy for the family-wide feed, or the album's own name +
 * description with rename/delete actions when one album is open. Renaming
 * swaps the h1 + description for AlbumTitleEditor in place, rather than
 * opening a separate form card next to the (still visible) title — that
 * used to duplicate the name on screen and push the page layout around.
 *
 * `headerActions` (PhotosPageLayout's UploadPhotoDialog) renders next to
 * the title in the non-editing state, but is dropped entirely while
 * renaming — the two used to sit side by side in a shared `flex
 * justify-between` row regardless of which state this was in, so once
 * AlbumTitleEditor's full-width form took the title's place, the row still
 * tried to space its now-narrow form away from the button, leaving an
 * awkward empty gap between them (caught live: see the screenshot this
 * fixed). Hiding the action during editing reads as "you're mid-rename,
 * finish that first" instead — a real, if minor, affordance, not just a
 * layout patch.
 */
export function AlbumPageHeader({
  familyId,
  familySlug,
  canEdit,
  activeAlbumId,
  activeAlbumName,
  activeAlbumDescription,
  headerActions,
}: {
  familyId: string;
  familySlug: string;
  canEdit: boolean;
  activeAlbumId: string | null;
  activeAlbumName: string | null;
  activeAlbumDescription: string | null;
  headerActions?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  if (!activeAlbumId || !activeAlbumName) {
    return (
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-4xl font-medium tracking-tight text-balance sm:text-5xl">
            Фото
          </h1>
          <p className="max-w-md text-muted-foreground">
            Все фотографии семьи в одном месте — те же снимки видны и в профилях
            отмеченных на них людей.
          </p>
        </div>
        {headerActions}
      </div>
    );
  }

  if (editing) {
    return (
      <AlbumTitleEditor
        familyId={familyId}
        albumId={activeAlbumId}
        defaultName={activeAlbumName}
        defaultDescription={activeAlbumDescription}
        onCancel={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1">
          <h1 className="font-heading text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            {activeAlbumName}
          </h1>
          {canEdit && (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Переименовать альбом"
                className="rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setEditing(true)}
              >
                <PencilIcon />
              </Button>
              <DeleteAlbumButton
                familyId={familyId}
                familySlug={familySlug}
                albumId={activeAlbumId}
                albumName={activeAlbumName}
              />
            </div>
          )}
        </div>
        {activeAlbumDescription && (
          <p className="text-muted-foreground">{activeAlbumDescription}</p>
        )}
      </div>
      {headerActions}
    </div>
  );
}
