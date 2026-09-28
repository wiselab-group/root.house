"use client";

import { useTranslations } from "next-intl";
import { CheckIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { QueuedPhotoPreview } from "./queued-photo-preview";
import { UploadProgressBar } from "./upload-progress-bar";
import type { QueuedPhoto } from "./photo-upload-grid";

/** One square in PhotoUploadGrid: the local preview plus its remove /
 *  progress / done / error overlay. */
export function QueuedPhotoTile({
  photo,
  onRemove,
}: {
  photo: QueuedPhoto;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations("media");
  const tc = useTranslations("common");

  return (
    <div className="group/tile relative aspect-square overflow-hidden rounded-md border border-border bg-muted">
      <QueuedPhotoPreview
        previewUrl={photo.previewUrl}
        fileName={photo.file.name}
      />

      {photo.status !== "done" && photo.status !== "error" && (
        <button
          type="button"
          onClick={() => onRemove(photo.id)}
          aria-label={t("removeFile", { name: photo.file.name })}
          className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-foreground/60 text-background opacity-0 transition-opacity group-hover/tile:opacity-100 focus-visible:opacity-100"
        >
          <XIcon className="size-3" />
        </button>
      )}

      {photo.status === "done" && (
        <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckIcon className="size-3" />
        </span>
      )}

      {photo.status === "uploading" && (
        <UploadProgressBar
          value={photo.progress}
          label={t("uploadingFile", { name: photo.file.name })}
          className="absolute inset-x-1.5 bottom-1.5"
        />
      )}

      {photo.status === "error" && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-destructive/80 p-1 text-center text-[10px] leading-tight text-white",
          )}
        >
          {photo.error ?? tc("error")}
        </div>
      )}
    </div>
  );
}
