"use client";

import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";

/**
 * Shows the picked-but-not-yet-uploaded file with a preview and explicit
 * Upload/Cancel controls — used by both PhotoUploadForm and
 * PhotoUploadPanel so choosing a file is a deliberate two-step action
 * ("pick, review, confirm") rather than an instant upload the moment the
 * OS file picker closes. A local object URL (not next/image, which can't
 * render a not-yet-uploaded File) is created on mount and revoked on
 * unmount/file change to avoid leaking memory.
 */
export function PhotoPreviewCard({
  file,
  isUploading,
  error,
  onConfirm,
  onCancel,
}: {
  file: File;
  isUploading: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Derived from `file`, not fetched/subscribed — computed directly during
  // render (memoized so it's stable across re-renders of the same file) per
  // React's "you might not need an effect" guidance. The effect below only
  // handles the cleanup side (revoking the URL), which is an external-system
  // concern an effect is actually for.
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview of a not-yet-uploaded File, next/image can't render it */}
      <img
        src={previewUrl}
        alt="Предпросмотр фото"
        className="max-h-64 w-full rounded-md object-contain"
      />
      <p className="truncate text-sm text-muted-foreground">{file.name}</p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={isUploading}
          aria-busy={isUploading}
          onClick={onConfirm}
        >
          {isUploading ? "Загружаем…" : "Загрузить"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isUploading}
          onClick={onCancel}
        >
          Отмена
        </Button>
      </div>
    </div>
  );
}
