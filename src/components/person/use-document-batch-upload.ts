"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadDocument } from "@/lib/upload-document";
import type { QueuedDocument } from "./document-upload-queue";

let queuedDocumentIdCounter = 0;
const DONE_TILE_LINGER_MS = 600;

/**
 * Owns the queue of picked-but-not-yet-uploaded documents for
 * DocumentUploadPanel — same shape as media/use-photo-batch-upload.ts, minus
 * previewUrl (a PDF/scan has no useful <img> preview the way a photo does —
 * DocumentUploadQueue shows a file-type icon instead) and minus the
 * album/personIds arrays (a document always tags exactly one person, the
 * profile it was uploaded from). Always autoUpload — same reasoning as
 * PersonPhotoUploadPanel's own doc comment: the profile's Документы section
 * above already re-renders via router.refresh(), so a lingering "done" tile
 * here would just duplicate it.
 */
export function useDocumentBatchUpload(familyId: string, personId: string) {
  const router = useRouter();
  const [documents, setDocuments] = useState<QueuedDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  function addFiles(files: File[]) {
    const newDocuments: QueuedDocument[] = files.map((file) => ({
      id: `${Date.now()}-${queuedDocumentIdCounter++}`,
      file,
      status: "queued",
      progress: 0,
    }));
    setDocuments((prev) => [...prev, ...newDocuments]);
    void uploadAll(newDocuments);
  }

  function removeDocument(id: string) {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  }

  function patchDocument(id: string, patch: Partial<QueuedDocument>) {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    );
  }

  async function uploadAll(pending: QueuedDocument[]) {
    setIsUploading(true);

    await Promise.all(
      pending.map(async (doc) => {
        patchDocument(doc.id, { status: "uploading" });
        try {
          await uploadDocument({
            familyId,
            personId,
            file: doc.file,
            onProgress: (progress) => patchDocument(doc.id, { progress }),
          });
          patchDocument(doc.id, { status: "done" });
          setTimeout(() => removeDocument(doc.id), DONE_TILE_LINGER_MS);
        } catch (err) {
          patchDocument(doc.id, {
            status: "error",
            error: err instanceof Error ? err.message : "Ошибка загрузки",
          });
        }
      }),
    );

    setIsUploading(false);
    router.refresh();
  }

  return { documents, isUploading, addFiles, removeDocument };
}
