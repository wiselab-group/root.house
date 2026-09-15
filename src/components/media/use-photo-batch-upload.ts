"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadPhoto } from "@/lib/upload-photo";
import type { QueuedPhoto } from "./photo-upload-grid";

let queuedPhotoIdCounter = 0;

/**
 * Owns the queue of picked-but-not-yet-uploaded photos for PhotoUploadPanel
 * — split out from the panel component itself to keep it under CLAUDE.md's
 * 150-line ceiling. Each queued photo uploads independently (Promise.all,
 * not sequential) so one slow/failing upload doesn't block the rest of the
 * batch from finishing.
 */
export function usePhotoBatchUpload(familyId: string) {
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

  async function uploadAll(albumIds: string[]) {
    const pending = photos.filter((photo) => photo.status === "queued");
    if (pending.length === 0) return;

    setIsUploading(true);

    await Promise.all(
      pending.map(async (photo) => {
        patchPhoto(photo.id, { status: "uploading" });
        try {
          await uploadPhoto({
            familyId,
            personIds: [],
            albumIds,
            file: photo.file,
            onProgress: (fraction) =>
              patchPhoto(photo.id, { progress: fraction }),
          });
          patchPhoto(photo.id, { status: "done", progress: 1 });
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
