"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { CheckIcon, DownloadIcon, UserPlusIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { glassIconButton, glassPill } from "@/components/hero/glass";
import { mediaDownloadUrl } from "@/lib/media-url";

/**
 * The lightbox's top bar: «3 / 24» on the left, then the caption (desktop
 * only — on phones it sits under the photo), then tagging, download and
 * close. Glass controls straight on the lightbox's warm backdrop, no bar
 * background of its own.
 */
export function LightboxTopBar({
  index,
  total,
  caption,
  wide,
  canTag,
  tagging,
  onToggleTagging,
  mediaId,
  familyId,
}: {
  index: number;
  total: number;
  /** The PhotoCaption, or null on phones. */
  caption: ReactNode;
  wide: boolean;
  canTag: boolean;
  tagging: boolean;
  onToggleTagging: () => void;
  mediaId: string;
  familyId: string;
}) {
  const t = useTranslations("media");
  const tc = useTranslations("common");

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 px-3 md:pointer-fine:h-16 md:pointer-fine:px-4">
      <p className="shrink-0 text-sm text-muted-foreground tabular-nums">
        <span className="sr-only">
          {t("photoPosition", { index: index + 1, total })}
        </span>
        <span aria-hidden="true">
          <span className="text-foreground">{index + 1}</span> / {total}
        </span>
      </p>
      {wide && (
        <span aria-hidden="true" className="h-5 w-px shrink-0 bg-glass-edge" />
      )}
      <div className="min-w-0 flex-1">{caption}</div>
      {canTag && (
        <TaggingToggle
          wide={wide}
          tagging={tagging}
          onToggle={onToggleTagging}
        />
      )}
      <a
        href={mediaDownloadUrl(mediaId, familyId)}
        download
        aria-label={t("downloadPhoto")}
        className={glassIconButton}
      >
        <DownloadIcon />
      </a>
      <DialogPrimitive.Close
        render={
          <button
            type="button"
            aria-label={tc("close")}
            className={glassIconButton}
          />
        }
      >
        <XIcon />
      </DialogPrimitive.Close>
    </header>
  );
}

/** «Отметить людей» (a labeled pill on desktop, an icon on phones) turns into
 *  the green «Готово» that ends the mode — the confirm color, same as
 *  PhotoArrangeBar's (see CLAUDE.md DESIGN TOKENS). */
function TaggingToggle({
  wide,
  tagging,
  onToggle,
}: {
  wide: boolean;
  tagging: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("media");
  const tc = useTranslations("common");
  const labeled = tagging || wide;
  return (
    <button
      type="button"
      aria-pressed={tagging}
      aria-label={labeled ? undefined : t("tagPeople")}
      onClick={onToggle}
      className={cn(
        labeled ? glassPill : glassIconButton,
        tagging &&
          "border-transparent bg-confirm text-confirm-foreground hover:bg-confirm/85 focus-visible:ring-confirm/50",
      )}
    >
      {tagging ? <CheckIcon /> : <UserPlusIcon />}
      {labeled && (tagging ? tc("done") : t("tagPeople"))}
    </button>
  );
}
