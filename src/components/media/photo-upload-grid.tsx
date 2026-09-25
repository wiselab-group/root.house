"use client";

import { CheckIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { UploadProgressBar } from "./upload-progress-bar";

export type QueuedPhoto = {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
};

/**
 * Grid of picked-but-not-fully-uploaded photos for PhotoUploadPanel's
 * multi-file flow — each tile shows its own progress bar while uploading
 * and a checkmark once done, so a batch of 5-10 photos reads as "here's
 * where we are" at a glance instead of one shared progress bar that can't
 * say which file is stuck.
 */
export function PhotoUploadGrid({
  photos,
  onRemove,
}: {
  photos: QueuedPhoto[];
  onRemove: (id: string) => void;
}) {
  if (photos.length === 0) return null;

  return (
    <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="group/tile relative aspect-square overflow-hidden rounded-md border border-border bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview of a not-yet-uploaded File */}
          <img
            src={photo.previewUrl}
            alt=""
            className="size-full object-cover"
          />

          {photo.status !== "done" && photo.status !== "error" && (
            <button
              type="button"
              onClick={() => onRemove(photo.id)}
              aria-label={`Убрать ${photo.file.name}`}
              className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-foreground/60 text-background opacity-0 transition-opacity group-hover/tile:opacity-100"
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
              label={`Загрузка ${photo.file.name}`}
              className="absolute inset-x-1.5 bottom-1.5"
            />
          )}

          {photo.status === "error" && (
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center bg-destructive/80 p-1 text-center text-[10px] leading-tight text-white",
              )}
            >
              {photo.error ?? "Ошибка"}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
