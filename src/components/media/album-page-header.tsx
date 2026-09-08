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
 */
export function AlbumPageHeader({
  familyId,
  familySlug,
  canEdit,
  activeAlbumId,
  activeAlbumName,
  activeAlbumDescription,
}: {
  familyId: string;
  familySlug: string;
  canEdit: boolean;
  activeAlbumId: string | null;
  activeAlbumName: string | null;
  activeAlbumDescription: string | null;
}) {
  const [editing, setEditing] = useState(false);

  if (!activeAlbumId || !activeAlbumName) {
    return (
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-medium">Фото</h1>
        <p className="text-muted-foreground">
          Все фотографии семьи в одном месте — те же снимки видны и в профилях
          отмеченных на них людей.
        </p>
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
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <h1 className="font-heading text-2xl font-medium">{activeAlbumName}</h1>
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
  );
}
