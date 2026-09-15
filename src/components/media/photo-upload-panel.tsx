"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlbumMultiCombobox } from "./album-multi-combobox";
import { PhotoDropzone } from "./photo-dropzone";
import { PhotoUploadGrid } from "./photo-upload-grid";
import { usePhotoBatchUpload } from "./use-photo-batch-upload";

/**
 * Upload panel for the family-wide gallery (/families/[slug]/photos) — a
 * drag&drop, multiple-files-at-once dropzone (PhotoDropzone) with per-tile
 * progress (PhotoUploadGrid, state owned by usePhotoBatchUpload). Kept
 * deliberately minimal on fields: people are tagged separately, later,
 * against the already-uploaded photo (there is no "who's in this photo?"
 * step here) and privacy silently defaults to "family" (changeable
 * afterwards from the photo itself) — the only decision this panel still
 * asks about is which album, and only when that isn't already obvious:
 * uploading from inside an album (defaultAlbums non-empty) tags every photo
 * into it without asking, same as before.
 *
 * Unlike the old single-file version, does NOT reset to empty after a
 * successful batch — the grid stays showing what was just uploaded (with
 * checkmarks) until the panel is closed, so a person can see everything
 * that made it in before dismissing.
 */
export function PhotoUploadPanel({
  familyId,
  albums,
  defaultAlbums = [],
  onCancel,
}: {
  familyId: string;
  /** The family's existing albums, for AlbumMultiCombobox — fetched once by the parent page, not re-fetched per upload. */
  albums: { id: string; name: string }[];
  /** Pre-selected albums — e.g. the album this panel is rendered inside of on /photos/[albumId], so an upload from that page lands there without asking. When non-empty, the album picker is hidden entirely (see doc comment above). */
  defaultAlbums?: { id: string; name: string }[];
  onCancel: () => void;
}) {
  const isInsideAlbum = defaultAlbums.length > 0;
  const [taggedAlbums, setTaggedAlbums] =
    useState<{ id: string; name: string }[]>(defaultAlbums);
  const {
    photos,
    isUploading,
    addFiles,
    removePhoto,
    uploadAll,
    doneCount,
    hasPending,
  } = usePhotoBatchUpload(familyId);

  return (
    <div className="flex flex-col gap-3">
      {isInsideAlbum ? (
        <p className="text-sm text-muted-foreground">
          Фото добавятся в альбом «{defaultAlbums[0]?.name}»
        </p>
      ) : (
        <AlbumMultiCombobox
          albums={albums}
          value={taggedAlbums}
          onChange={setTaggedAlbums}
        />
      )}

      <PhotoDropzone disabled={isUploading} onFiles={addFiles} />

      <PhotoUploadGrid photos={photos} onRemove={removePhoto} />

      {photos.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Кто на фото и видимость можно настроить позже, прямо на фото.
        </p>
      )}

      <div className="flex items-center gap-2">
        {photos.length > 0 && (
          <span className="mr-auto text-sm text-muted-foreground">
            {doneCount} из {photos.length} загружено
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isUploading}
        >
          {doneCount > 0 && !hasPending ? "Готово" : "Отмена"}
        </Button>
        {hasPending && (
          <Button
            type="button"
            onClick={() => uploadAll(taggedAlbums.map((album) => album.id))}
            disabled={isUploading}
            aria-busy={isUploading}
          >
            {isUploading ? "Загружаем…" : "Загрузить"}
          </Button>
        )}
      </div>
    </div>
  );
}
