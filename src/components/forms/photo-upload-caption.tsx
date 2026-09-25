import { UploadProgressBar } from "@/components/media/upload-progress-bar";

/**
 * The line under PersonPhotoUpload's circle: the upload's progress while
 * one is running, otherwise a hint (only at the default size — the compact
 * one sits in a tight row). Split out of person-photo-upload.tsx for the
 * 150-line component limit.
 */
export function PhotoUploadCaption({
  progress,
  hasPhoto,
  showHint,
}: {
  progress: number | null;
  hasPhoto: boolean;
  showHint: boolean;
}) {
  if (progress !== null) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <UploadProgressBar value={progress} className="w-24" />
        <p
          className="text-xs whitespace-nowrap text-muted-foreground tabular-nums"
          aria-live="polite"
        >
          {progress < 0.9
            ? `Загружаем фото… ${Math.round(progress * 100)}%`
            : "Сохраняем…"}
        </p>
      </div>
    );
  }
  if (!showHint) return null;
  return (
    <p className="text-xs text-muted-foreground">
      {hasPhoto
        ? "Нажмите или перетащите, чтобы заменить"
        : "Нажмите или перетащите фото"}
    </p>
  );
}
