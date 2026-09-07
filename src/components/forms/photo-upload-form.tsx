"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PhotoPreviewCard } from "@/components/media/photo-preview-card";
import { uploadPhoto } from "@/lib/upload-photo";

/**
 * Picking a file only stages it for review (PhotoPreviewCard) — it does
 * NOT upload immediately. Uploading happens through fetch() to
 * /api/media/upload (a Route Handler, not a Server Action) so the file
 * passes through our server as multipart form data rather than needing
 * Server Actions' more restrictive body-size handling or Vercel Blob's
 * client-token flow (which only supports public blobs — see the route
 * handler's doc comment for why that's a non-starter here).
 */
export function PhotoUploadForm({
  familyId,
  personId,
}: {
  familyId: string;
  personId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPendingFile(file);
  }

  function cancel() {
    setPendingFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function confirm() {
    if (!pendingFile) return;

    setIsUploading(true);
    setError(null);

    try {
      await uploadPhoto({ familyId, personIds: [personId], file: pendingFile });
      setPendingFile(null);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить фото",
      );
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (pendingFile) {
    return (
      <PhotoPreviewCard
        file={pendingFile}
        isUploading={isUploading}
        error={error}
        onConfirm={confirm}
        onCancel={cancel}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={handleFileChange}
        className="hidden"
        id="photo-upload-input"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
      >
        Добавить фото
      </Button>
    </div>
  );
}
