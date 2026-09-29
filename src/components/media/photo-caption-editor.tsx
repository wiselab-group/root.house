"use client";

import { useTranslations } from "next-intl";
import { CheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PHOTO_CAPTION_MAX_LENGTH } from "@/domain/media/photo-caption";

/**
 * PhotoCaption's inline editor — a glass pill in the lightbox's top bar
 * (desktop) or under the photo (phones), the same glass as the rest of the
 * lightbox. Enter saves; Escape cancels and is stopped here so it doesn't
 * also close the lightbox. The error floats under the field instead of
 * adding a line, so the bar keeps its height.
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
      className="relative w-full max-w-2xl min-w-0"
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
          className="h-9 min-w-0 flex-1 rounded-full border border-glass-edge bg-glass px-4 text-sm text-foreground backdrop-blur-xl transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-glass-strong"
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
        <p
          role="alert"
          className="absolute top-full left-0 z-20 mt-1.5 rounded-full bg-popover/95 px-3 py-1 text-xs text-destructive shadow-lg backdrop-blur-xl"
        >
          {error}
        </p>
      )}
    </form>
  );
}
