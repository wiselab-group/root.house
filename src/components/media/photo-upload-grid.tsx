"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { PHOTO_CAPTION_MAX_LENGTH } from "@/domain/media/photo-caption";
import { cn } from "@/lib/utils";
import { QueuedPhotoTile } from "./queued-photo-tile";
import type { BatchItem } from "./batch-upload-progress";

export type QueuedPhoto = {
  id: string;
  file: File;
  previewUrl: string;
  /** Typed while queued, sent with the upload — see photo-caption.ts. */
  caption: string;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
};

/** A queue in BatchUploadSummary's terms. */
export function toBatchItems(photos: QueuedPhoto[]): BatchItem[] {
  return photos.map((photo) => ({
    sizeBytes: photo.file.size,
    progress: photo.progress,
    status: photo.status,
  }));
}

/**
 * Grid of picked-but-not-fully-uploaded photos for PhotoUploadPanel's
 * multi-file flow — each tile shows its own progress bar while uploading
 * and a checkmark once done, so a batch of 5-10 photos reads as "here's
 * where we are" at a glance instead of one shared progress bar that can't
 * say which file is stuck.
 *
 * With `onCaptionChange` every tile gets a caption field under it and the
 * grid goes wider-tiled (2–3 columns instead of 4–5) so the field has room
 * to type in. The field locks once the photo starts uploading — the caption
 * travels with the upload, later edits happen in the lightbox. Without it
 * (PersonPhotoUploadPanel's instant upload, where a tile lives for about a
 * second) the grid stays compact and captions are added from the lightbox.
 */
export function PhotoUploadGrid({
  photos,
  onRemove,
  onCaptionChange,
}: {
  photos: QueuedPhoto[];
  onRemove: (id: string) => void;
  onCaptionChange?: (id: string, caption: string) => void;
}) {
  const t = useTranslations("media");
  if (photos.length === 0) return null;

  return (
    <div
      className={cn(
        "grid gap-2.5",
        onCaptionChange
          ? "grid-cols-2 gap-y-3 sm:grid-cols-3"
          : "grid-cols-4 sm:grid-cols-5",
      )}
    >
      {photos.map((photo) =>
        onCaptionChange ? (
          <div key={photo.id} className="flex flex-col gap-1.5">
            <QueuedPhotoTile photo={photo} onRemove={onRemove} />
            <Input
              value={photo.caption}
              onChange={(event) =>
                onCaptionChange(photo.id, event.target.value)
              }
              disabled={photo.status !== "queued"}
              maxLength={PHOTO_CAPTION_MAX_LENGTH}
              placeholder={t("captionPlaceholder")}
              aria-label={t("captionFor", { name: photo.file.name })}
              className="h-8 text-sm"
            />
          </div>
        ) : (
          <QueuedPhotoTile key={photo.id} photo={photo} onRemove={onRemove} />
        ),
      )}
    </div>
  );
}
