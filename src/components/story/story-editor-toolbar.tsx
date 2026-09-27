"use client";

import { useTranslations } from "next-intl";
import { ArrowLeftIcon, CheckIcon, CloudOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import type { AutosaveStatus } from "./use-story-autosave";

function AutosaveStatusText({ status }: { status: AutosaveStatus }) {
  const t = useTranslations("storyForm");
  if (status === "idle") return null;
  if (status === "error") {
    return (
      <>
        <CloudOffIcon aria-hidden="true" className="size-3.5 shrink-0" />
        {t("draftSaveFailed")}
      </>
    );
  }
  return (
    <>
      {status === "saved" && (
        <CheckIcon aria-hidden="true" className="size-3.5 shrink-0" />
      )}
      {status === "saving" ? t("draftSaving") : t("draftSaved")}
    </>
  );
}

/** The story editor's one quiet bar, pinned to the top while writing: back,
 *  the autosave status, and the submit — «Опубликовать» for a draft,
 *  «Сохранить» for a published story. `notice` (the offer to restore
 *  autosaved edits) rides in the pinned bar too — a reload restores the
 *  scroll position, which would otherwise leave it out of sight. */
export function StoryEditorToolbar({
  backHref,
  isDraft,
  status,
  pending,
  notice,
}: {
  backHref: string;
  isDraft: boolean;
  status: AutosaveStatus;
  /** From the form's useActionState — it submits via submitWithoutReset,
   *  which useFormStatus doesn't see. */
  pending: boolean;
  notice?: React.ReactNode;
}) {
  const t = useTranslations("storyForm");
  const tc = useTranslations("common");
  const submitLabel = isDraft
    ? pending
      ? t("publishing")
      : t("publish")
    : pending
      ? tc("saving")
      : tc("save");
  return (
    <div className="sticky top-0 z-20 border-b border-border bg-background/80 supports-backdrop-filter:backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <LinkButton href={backHref} variant="ghost" className="-ml-2">
          <ArrowLeftIcon aria-hidden="true" />
          {isDraft ? t("backToStories") : t("backToStory")}
        </LinkButton>
        <div className="flex min-w-0 items-center gap-4">
          <p
            aria-live="polite"
            className={`hidden min-w-0 items-center gap-1.5 truncate text-sm sm:flex ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}
          >
            <AutosaveStatusText status={status} />
          </p>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {submitLabel}
          </Button>
        </div>
      </div>
      {notice && (
        <div className="mx-auto max-w-176 px-4 pb-3 sm:px-8">{notice}</div>
      )}
    </div>
  );
}
