"use client";

import { useId, useRef } from "react";
import { Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useImageDrop } from "@/hooks/use-image-drop";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PHOTO_ACCEPT } from "@/domain/media/upload-rules";
import { PhotoUploadCaption } from "./photo-upload-caption";
import { PHOTO_UPLOAD_SIZE_STYLES as SIZE_STYLES } from "./person-photo-upload-sizes";

/**
 * Shared drag&drop avatar picker UI (reui's c-file-upload-2 pattern adapted
 * to this app's tokens) — click or drop an image directly onto the circular
 * preview instead of a separate "upload" button next to it. Deliberately
 * dumb about persistence: it only reports the picked File via onFileSelect
 * and shows whatever previewUrl/fallback the caller passes in, so both
 * AvatarEditor (uploads immediately, personId already exists) and
 * PersonPhotoPicker (holds the File until the person is created) can share
 * this exact UI without duplicating the drop-zone markup.
 */
export function PersonPhotoUpload({
  previewUrl,
  fallback,
  onFileSelect,
  onRemove,
  removeLabel = "Удалить фото",
  disabled = false,
  isBusy = false,
  progress = null,
  size = "default",
  className,
}: {
  previewUrl?: string | null;
  fallback: React.ReactNode;
  onFileSelect: (file: File) => void;
  onRemove?: () => void;
  /** Accessible name of the remove (×) button. */
  removeLabel?: string;
  disabled?: boolean;
  isBusy?: boolean;
  /** Upload progress, 0–1 — shown as a bar under the photo while set. */
  progress?: number | null;
  size?: "default" | "compact";
  className?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const isDisabled = disabled || isBusy;
  const styles = SIZE_STYLES[size];

  const { isDragging, error, handleFile, dragHandlers } = useImageDrop({
    disabled: isDisabled,
    onFile: onFileSelect,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative">
        <div
          role="button"
          tabIndex={isDisabled ? -1 : 0}
          aria-disabled={isDisabled}
          aria-busy={isBusy}
          className={cn(
            "group/dropzone relative cursor-pointer overflow-hidden rounded-full border border-dashed border-border text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            !previewUrl && "hover:border-primary/40",
            styles.dropzone,
            isDragging && "border-primary bg-primary/5",
            previewUrl && "border-solid border-transparent",
            isDisabled && "pointer-events-none opacity-50",
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
            id={inputId}
            type="file"
            accept={PHOTO_ACCEPT}
            onChange={handleChange}
            disabled={isDisabled}
            className="sr-only"
          />
          <Avatar size="lg" className={cn(styles.avatar, "after:border-none")}>
            {previewUrl && <AvatarImage src={previewUrl} alt="" />}
            <AvatarFallback className={styles.fallbackText}>
              {isBusy ? null : previewUrl ? null : fallback}
            </AvatarFallback>
          </Avatar>
          {!isBusy && (
            <div
              className={cn(
                "pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover/dropzone:opacity-100 pointer-coarse:opacity-100",
                previewUrl ? "bg-foreground/40" : "bg-muted",
              )}
            >
              <Camera
                className={cn(
                  styles.camera,
                  previewUrl ? "text-background" : "text-primary",
                )}
                strokeWidth={1.5}
              />
            </div>
          )}
        </div>

        {previewUrl && onRemove && !isBusy && (
          <Button
            type="button"
            size="icon-xs"
            variant="outline"
            onClick={onRemove}
            disabled={isDisabled}
            className={cn(
              "absolute end-0 top-0 z-10 rounded-full bg-background",
              styles.remove,
            )}
            aria-label={removeLabel}
          >
            <X />
          </Button>
        )}
      </div>

      <PhotoUploadCaption
        progress={progress}
        hasPhoto={Boolean(previewUrl)}
        showHint={size === "default"}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
