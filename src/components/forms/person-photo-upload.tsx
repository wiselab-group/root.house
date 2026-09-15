"use client";

import { useId, useRef } from "react";
import { Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useImageDrop } from "@/hooks/use-image-drop";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

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
const SIZE_STYLES = {
  default: {
    dropzone: "size-24",
    avatar: "size-24!",
    fallbackText: "text-lg",
    camera: "size-6",
    remove: "size-6 [&_svg]:size-3.5",
  },
  compact: {
    dropzone: "size-20",
    avatar: "size-20!",
    fallbackText: "text-base",
    camera: "size-5",
    remove: "size-6 [&_svg]:size-3.5",
  },
} as const;

export function PersonPhotoUpload({
  previewUrl,
  fallback,
  onFileSelect,
  onRemove,
  disabled = false,
  isBusy = false,
  size = "default",
  className,
}: {
  previewUrl?: string | null;
  fallback: React.ReactNode;
  onFileSelect: (file: File) => void;
  onRemove?: () => void;
  disabled?: boolean;
  isBusy?: boolean;
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
            !previewUrl &&
              "hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
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
            accept="image/jpeg,image/png,image/webp,image/heic"
            onChange={handleChange}
            disabled={isDisabled}
            className="sr-only"
          />
          <Avatar size="lg" className={cn(styles.avatar, "after:border-none")}>
            {previewUrl && <AvatarImage src={previewUrl} alt="" />}
            <AvatarFallback
              className={cn(
                styles.fallbackText,
                !previewUrl && "group-hover/dropzone:text-primary",
              )}
            >
              {isBusy ? (
                size === "default" && (
                  <span className="text-xs text-muted-foreground">
                    Загружаем…
                  </span>
                )
              ) : previewUrl ? null : (
                <>
                  <span className="group-hover/dropzone:hidden">
                    {fallback}
                  </span>
                  <Camera
                    className={cn(
                      styles.camera,
                      "hidden group-hover/dropzone:block",
                    )}
                    strokeWidth={1.5}
                  />
                </>
              )}
            </AvatarFallback>
          </Avatar>
          {previewUrl && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-foreground/40 opacity-0 transition-opacity group-hover/dropzone:opacity-100">
              <Camera
                className={cn(styles.camera, "text-background")}
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
            aria-label="Удалить фото"
          >
            <X />
          </Button>
        )}
      </div>

      {size === "default" && (
        <p className="text-xs text-muted-foreground">
          {previewUrl
            ? "Нажмите или перетащите, чтобы заменить"
            : "Нажмите или перетащите фото"}
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
