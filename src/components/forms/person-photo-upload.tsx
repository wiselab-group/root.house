"use client";

import { useTranslations } from "next-intl";
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
 * to this app's tokens) — click or drop an image directly onto the preview
 * instead of a separate "upload" button next to it. Styled as the app's one
 * person avatar, PersonThumb (user request 2026-09-27: «ава должна быть в
 * стиле сайта»): a rounded square with the sage identity ring, initials on
 * the same glass fill — terracotta ring only while a file is dragged over. Deliberately
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
  removeLabel,
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
  const t = useTranslations("personForm");
  const removeButtonLabel = removeLabel ?? t("removePhoto");
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
            "group/dropzone relative cursor-pointer overflow-hidden bg-glass-strong text-foreground/60 ring-[1.5px] ring-tree-accent transition-shadow duration-base ease-(--ease-reveal) focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none",
            styles.dropzone,
            isDragging && "ring-[3px] ring-primary",
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
          <Avatar
            size="lg"
            className={cn(
              styles.avatar,
              "rounded-none bg-transparent after:border-none",
            )}
          >
            {previewUrl && (
              <AvatarImage
                src={previewUrl}
                alt=""
                className="rounded-none object-cover object-[50%_25%]"
              />
            )}
            <AvatarFallback
              className={cn(
                styles.fallbackText,
                "rounded-none bg-transparent font-medium text-foreground/60",
              )}
            >
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
              // On the corner, clear of the face.
              "absolute -end-2 -top-2 z-10 rounded-full bg-background",
              styles.remove,
            )}
            aria-label={removeButtonLabel}
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
