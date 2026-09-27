"use client";

import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import { ArrowLeftIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";

function SaveButton() {
  const tc = useTranslations("common");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? tc("saving") : tc("save")}
    </Button>
  );
}

/** The story editor's one quiet bar, pinned to the top while writing:
 *  back to the story, the local-draft status, «Сохранить». `notice` (the
 *  leftover-draft offer) rides in the pinned bar too — a reload restores
 *  the scroll position, which would otherwise leave it out of sight. */
export function StoryEditorToolbar({
  backHref,
  draftSaved,
  notice,
}: {
  backHref: string;
  draftSaved: boolean;
  notice?: React.ReactNode;
}) {
  const t = useTranslations("storyForm");
  return (
    <div className="sticky top-0 z-20 border-b border-border bg-background/80 supports-backdrop-filter:backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <LinkButton href={backHref} variant="ghost" className="-ml-2">
          <ArrowLeftIcon aria-hidden="true" />
          {t("backToStory")}
        </LinkButton>
        <div className="flex min-w-0 items-center gap-4">
          <p
            aria-live="polite"
            className="hidden min-w-0 items-center gap-1.5 truncate text-sm text-muted-foreground sm:flex"
          >
            {draftSaved && (
              <>
                <CheckIcon aria-hidden="true" className="size-3.5 shrink-0" />
                {t("draftSaved")}
              </>
            )}
          </p>
          <SaveButton />
        </div>
      </div>
      {notice && (
        <div className="mx-auto max-w-176 px-4 pb-3 sm:px-8">{notice}</div>
      )}
    </div>
  );
}
