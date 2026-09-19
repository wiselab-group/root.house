"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadPhoto } from "@/lib/upload-photo";
import type { QueuedPhoto } from "./photo-upload-grid";

let queuedPhotoIdCounter = 0;

/** How long a "done" tile stays visible (checkmark) before autoUpload
 *  removes it from the queue — long enough to register as feedback, short
 *  enough that a multi-photo batch doesn't linger before the grid above
 *  (already refreshed) is all that's left. */
const DONE_TILE_LINGER_MS = 600;

/**
 * Owns the queue of picked-but-not-yet-uploaded photos for PhotoUploadPanel
 * and PersonPhotoUploadPanel — split out from the panel components
 * themselves to keep them under CLAUDE.md's 150-line ceiling. Each queued
 * photo uploads independently (Promise.all, not sequential) so one
 * slow/failing upload doesn't block the rest of the batch from finishing.
 *
 * `personIds` tags every photo in the batch with the same person (or
 * persons) — used by PersonPhotoUploadPanel to pin uploads to the profile
 * they were started from, since that page has no per-photo tagging step.
 * Defaults to untagged for the family-wide gallery, where tagging happens
 * later against each already-uploaded photo.
 *
 * `autoUpload` starts uploading a file the moment it's dropped/picked
 * (no separate "Загрузить" confirmation step) and drops each tile from the
 * queue as soon as it finishes — used by PersonPhotoUploadPanel, where the
 * photo reappears immediately in the gallery grid above via router.refresh(),
 * so leaving a "done" checkmark tile behind would just show the same photo
 * twice. The family-wide gallery keeps the manual confirm + lingering
 * "done" grid (see PhotoUploadPanel's own doc comment for why).
 */
export function usePhotoBatchUpload(
  familyId: string,
  personIds: string[] = [],
  autoUpload = false,
) {
  const router = useRouter();
  const [photos, setPhotos] = useState<QueuedPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  function addFiles(files: File[]) {
    const newPhotos: QueuedPhoto[] = files.map((file) => ({
      id: `${Date.now()}-${queuedPhotoIdCounter++}`,
      file,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
      status: "queued",
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
    if (autoUpload) void uploadAll([], newPhotos);
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((photo) => photo.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((photo) => photo.id !== id);
    });
  }

  function patchPhoto(id: string, patch: Partial<QueuedPhoto>) {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  }

  async function uploadAll(albumIds: string[], only?: QueuedPhoto[]) {
    const pending = (only ?? photos).filter(
      (photo) => photo.status === "queued",
    );
    if (pending.length === 0) return;

    setIsUploading(true);

    await Promise.all(
      pending.map(async (photo) => {
        patchPhoto(photo.id, { status: "uploading" });
        try {
          await uploadPhoto({
            familyId,
            personIds,
            albumIds,
            file: photo.file,
            onProgress: (fraction) =>
              patchPhoto(photo.id, { progress: fraction }),
          });
          patchPhoto(photo.id, { status: "done", progress: 1 });
          if (autoUpload) {
            setTimeout(() => removePhoto(photo.id), DONE_TILE_LINGER_MS);
          }
        } catch (err) {
          patchPhoto(photo.id, {
            status: "error",
            error: err instanceof Error ? err.message : "Ошибка загрузки",
          });
        }
      }),
    );

    setIsUploading(false);
    router.refresh();
  }

  return {
    photos,
    isUploading,
    addFiles,
    removePhoto,
    uploadAll,
    doneCount: photos.filter((p) => p.status === "done").length,
    hasPending: photos.some((p) => p.status === "queued"),
  };
}
