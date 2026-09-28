"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { PencilIcon, PlusIcon } from "lucide-react";
import { updatePhotoCaptionAction } from "@/actions/media.actions";
import { cn } from "@/lib/utils";
import { PhotoCaptionEditor } from "./photo-caption-editor";

/**
 * The caption line under the photo in PhotoLightbox — the same
 * `media.title` the grid and lightbox use as the image's alt text. Read-only
 * for viewers (and hidden when empty); with `canEdit` the caption itself is
 * the edit button, and an uncaptioned photo shows a quiet «Добавить
 * подпись» instead. Rendered with `key={mediaId}`, so paging to another
 * photo drops any half-typed edit.
 *
 * Saving shows the new text at once and keeps it while the action's
 * revalidation brings the same value back through props; a failure puts the
 * editor back with the typed text and the error under it.
 */
export function PhotoCaption({
  mediaId,
  caption,
  familyId,
  familySlug,
  canEdit,
}: {
  mediaId: string;
  caption: string | null;
  familyId: string;
  familySlug: string;
  canEdit: boolean;
}) {
  const t = useTranslations("media");
  const [lastCaption, setLastCaption] = useState(caption);
  const [saved, setSaved] = useState(caption);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // A fresh prop (revalidation after this or another edit) wins over the
  // optimistic copy.
  if (caption !== lastCaption) {
    setLastCaption(caption);
    setSaved(caption);
  }

  function cancel() {
    setDraft(null);
    setError(null);
  }

  function save() {
    if (draft === null) return;
    const typed = draft;
    const previous = saved;
    setSaved(typed.replace(/\s+/g, " ").trim() || null);
    cancel();
    startTransition(async () => {
      const result = await updatePhotoCaptionAction(
        familyId,
        familySlug,
        mediaId,
        typed,
      );
      if ("error" in result) {
        setSaved(previous);
        setDraft(typed);
        setError(result.error);
      } else {
        setSaved(result.caption);
      }
    });
  }

  if (draft !== null) {
    return (
      <PhotoCaptionEditor
        value={draft}
        error={error}
        onChange={setDraft}
        onSave={save}
        onCancel={cancel}
      />
    );
  }

  if (!canEdit) {
    if (!saved) return null;
    return (
      <p className="mx-auto max-w-xl px-4 pb-3 text-center text-sm text-pretty text-white/85">
        {saved}
      </p>
    );
  }

  return (
    <div className="flex justify-center px-3 pb-3">
      <button
        type="button"
        onClick={() => setDraft(saved ?? "")}
        aria-busy={isPending || undefined}
        className={cn(
          "group/caption flex max-w-xl items-center gap-2 rounded-full px-3 py-1 text-sm transition-colors outline-none hover:bg-white/10 focus-visible:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/50",
          saved ? "text-center text-pretty text-white/85" : "text-white/55",
          isPending && "opacity-70",
        )}
      >
        {saved ? (
          <>
            <span className="sr-only">{t("editCaption")}: </span>
            <span>{saved}</span>
            <PencilIcon
              aria-hidden="true"
              className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover/caption:opacity-70 group-focus-visible/caption:opacity-70 pointer-coarse:opacity-70"
            />
          </>
        ) : (
          <>
            <PlusIcon aria-hidden="true" className="size-3.5 shrink-0" />
            {t("addCaption")}
          </>
        )}
      </button>
    </div>
  );
}
