"use client";

import { PhotoDropzone } from "./photo-dropzone";
import { BatchUploadSummary } from "./batch-upload-summary";
import { PhotoUploadGrid, toBatchItems } from "./photo-upload-grid";
import { usePhotoBatchUpload } from "./use-photo-batch-upload";

/**
 * Upload panel for a person's own photo gallery (person profile page) — the
 * same drag&drop, multiple-files-at-once experience as PhotoUploadPanel
 * (family-wide gallery), minus the album picker and the manual confirm
 * step: a photo starts uploading the moment it's dropped/picked
 * (autoUpload) and its tile disappears from the queue as soon as it's done,
 * since it's already visible again in the gallery grid above (router.refresh()) —
 * showing a lingering "done" checkmark tile here would just duplicate it.
 * Uploads here are always tagged with this one person and don't ask about
 * privacy (silently defaults to "family", same as the family gallery —
 * changeable afterwards from the photo itself).
 */
export function PersonPhotoUploadPanel({
  familyId,
  personId,
}: {
  familyId: string;
  personId: string;
}) {
  const { photos, isUploading, addFiles, removePhoto } = usePhotoBatchUpload(
    familyId,
    [personId],
    true,
  );

  return (
    <div className="flex flex-col gap-3">
      <PhotoDropzone disabled={isUploading} onFiles={addFiles} />

      <PhotoUploadGrid photos={photos} onRemove={removePhoto} />
      <BatchUploadSummary
        items={toBatchItems(photos)}
        forms={["фото", "фото", "фото"]}
      />
    </div>
  );
}
