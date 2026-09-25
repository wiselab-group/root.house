"use client";

import { useRef } from "react";
import { UploadCloudIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMultiImageDrop } from "@/hooks/use-multi-image-drop";
import { PHOTO_ACCEPT } from "@/domain/media/upload-rules";

/**
 * Multi-file drag&drop + click-to-pick surface for PhotoUploadPanel —
 * split out from the panel itself to keep it under CLAUDE.md's 150-line
 * component ceiling. Purely about picking files; the panel owns the
 * resulting queue/upload state.
 */
export function PhotoDropzone({
  disabled,
  onFiles,
}: {
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const { isDragging, error, handleFiles, dragHandlers } = useMultiImageDrop({
    disabled,
    onFiles,
  });

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        className={cn(
          "flex flex-col items-center gap-2 rounded-md border border-dashed border-border px-4 py-8 text-center transition-colors",
          isDragging && "border-primary bg-primary/5",
          disabled && "pointer-events-none opacity-50",
        )}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        {...dragHandlers}
      >
        <input
          ref={inputRef}
          type="file"
          accept={PHOTO_ACCEPT}
          multiple
          onChange={handleInputChange}
          disabled={disabled}
          className="sr-only"
          id="family-photo-upload-input"
        />
        <UploadCloudIcon className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">Перетащите фото сюда или нажмите</p>
        <p className="text-xs text-muted-foreground">
          Можно выбрать сразу несколько — JPEG, PNG, HEIC
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
