"use client";

import { useTranslations } from "next-intl";
import { CheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PHOTO_CAPTION_MAX_LENGTH } from "@/domain/media/photo-caption";

/**
 * PhotoCaption's inline editor, styled for the lightbox's black backdrop
 * (translucent white pill, like the tagged-people chips). Enter saves;
 * Escape cancels and is stopped here so it doesn't also close the lightbox.
 */
export function PhotoCaptionEditor({
  value,
  error,
  onChange,
  onSave,
  onCancel,
}: {
  value: string;
  error: string | null;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("media");
  const tc = useTranslations("common");

  return (
    <form
      className="mx-auto flex w-full max-w-xl flex-col gap-1.5 px-3 pb-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            onCancel();
          }}
          autoFocus
          maxLength={PHOTO_CAPTION_MAX_LENGTH}
          placeholder={t("captionPlaceholder")}
          aria-label={t("caption")}
          aria-invalid={error ? true : undefined}
          className="h-9 min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-4 text-sm text-white transition-colors outline-none placeholder:text-white/45 focus-visible:border-white/50 focus-visible:bg-white/15"
        />
        <Button
          type="submit"
          size="icon-sm"
          className="rounded-full"
          aria-label={tc("save")}
        >
          <CheckIcon />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          className="rounded-full"
          aria-label={tc("cancel")}
          onClick={onCancel}
        >
          <XIcon />
        </Button>
      </div>
      {error && (
        <p role="alert" className="px-4 text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
