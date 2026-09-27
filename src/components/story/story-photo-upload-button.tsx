"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PHOTO_ACCEPT } from "@/domain/media/upload-rules";
import { uploadPhoto } from "@/lib/upload-photo";
import { useUploadErrorMessage } from "@/hooks/use-upload-error-message";
import type { StoryPhotoChoice } from "@/actions/story.actions";

/**
 * «Загрузить новые» in StoryPhotoPicker — uploads the chosen files into the
 * family archive one after another (untagged, default privacy; tags and
 * albums are the archive's own job) and hands each one back as it lands.
 */
export function StoryPhotoUploadButton({
  familyId,
  onUploaded,
}: {
  familyId: string;
  onUploaded: (photo: StoryPhotoChoice) => void;
}) {
  const t = useTranslations("storyForm");
  const errorMessage = useUploadErrorMessage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: File[]) {
    setError(null);
    for (const [index, file] of files.entries()) {
      try {
        const { id } = await uploadPhoto({
          familyId,
          file,
          onProgress: (fraction) =>
            setProgress((index + fraction) / files.length),
        });
        onUploaded({ id, alt: null });
      } catch (caught) {
        setError(errorMessage(caught));
      }
    }
    setProgress(null);
  }

  const busy = progress !== null;
  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length > 0) void handleFiles(files);
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        aria-busy={busy}
        onClick={() => inputRef.current?.click()}
      >
        <UploadIcon data-icon="inline-start" />
        {busy
          ? t("uploadingPhotos", { percent: Math.round(progress * 100) })
          : t("uploadPhotos")}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
