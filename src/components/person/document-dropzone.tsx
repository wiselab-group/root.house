"use client";

import { useRef } from "react";
import { UploadCloudIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMultiImageDrop } from "@/hooks/use-multi-image-drop";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/heic,image/tiff";
const MAX_SIZE_BYTES = 25 * 1024 * 1024;

/**
 * Drag&drop + click-to-pick surface for DocumentUploadPanel — same shape as
 * PhotoDropzone, reusing useMultiImageDrop (it's file-type-agnostic despite
 * the name — accept/maxSize are both parameters) instead of writing a
 * parallel drop handler. accept covers PDF plus the scanned-image formats a
 * document is realistically photographed/scanned into (see
 * api/media/upload-document/route.ts's ALLOWED_CONTENT_TYPES, which this
 * must stay in sync with).
 */
export function DocumentDropzone({
  disabled,
  onFiles,
}: {
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const { isDragging, error, handleFiles, dragHandlers } = useMultiImageDrop({
    accept: ACCEPT,
    maxSize: MAX_SIZE_BYTES,
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
          accept={ACCEPT}
          multiple
          onChange={handleInputChange}
          disabled={disabled}
          className="sr-only"
          id="person-document-upload-input"
        />
        <UploadCloudIcon className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">
          Перетащите документ сюда или нажмите
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, JPEG, PNG, HEIC, TIFF — до 25 МБ
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
