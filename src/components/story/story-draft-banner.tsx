"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/** Offers a draft left on this device by an earlier visit. */
export function StoryDraftBanner({
  onRestore,
  onDiscard,
}: {
  onRestore: () => void;
  onDiscard: () => void;
}) {
  const t = useTranslations("storyForm");
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-glass-edge bg-glass px-4 py-3 text-sm"
    >
      <p>{t("draftFound")}</p>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDiscard}>
          {t("discardDraft")}
        </Button>
        <Button type="button" size="sm" onClick={onRestore}>
          {t("restoreDraft")}
        </Button>
      </div>
    </div>
  );
}
