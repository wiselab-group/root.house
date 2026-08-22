"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Uploads via fetch() to /api/media/upload (a Route Handler, not a Server
 * Action) so the file passes through our server as multipart form data
 * rather than needing Server Actions' more restrictive body-size handling
 * or Vercel Blob's client-token flow (which only supports public blobs —
 * see the route handler's doc comment for why that's a non-starter here).
 */
export function PhotoUploadForm({ familyId, personId }: { familyId: string; personId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("familyId", familyId);
      formData.set("personId", personId);
      formData.set("file", file);

      const response = await fetch("/api/media/upload", { method: "POST", body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Не удалось загрузить фото");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить фото");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={handleFileChange}
        disabled={isUploading}
        className="hidden"
        id="photo-upload-input"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isUploading}
        aria-busy={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? "Загружаем…" : "Добавить фото"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
