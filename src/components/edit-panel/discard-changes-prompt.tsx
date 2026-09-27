"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * «Закрыть без сохранения?» — shown inside the EditPanel (not a second
 * dialog stacked on top) when the user tries to close a form they've typed
 * into, so an accidental Esc or backdrop tap never silently drops edits.
 */
export function DiscardChangesPrompt({
  onKeep,
  onDiscard,
}: {
  onKeep: () => void;
  onDiscard: () => void;
}) {
  const t = useTranslations("editPanel");
  return (
    <div
      role="alertdialog"
      aria-labelledby="discard-changes-title"
      aria-describedby="discard-changes-body"
      className="absolute inset-x-3 bottom-3 z-10 flex animate-in flex-col gap-3 rounded-2xl border border-glass-edge bg-secondary p-4 shadow-xl duration-base ease-(--ease-reveal) fade-in-0 slide-in-from-bottom-2 pb-[max(1rem,env(safe-area-inset-bottom))] motion-reduce:animate-none"
    >
      <div className="flex flex-col gap-1">
        <p id="discard-changes-title" className="font-medium">
          {t("discardTitle")}
        </p>
        <p id="discard-changes-body" className="text-sm text-muted-foreground">
          {t("discardBody")}
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDiscard}>
          {t("discard")}
        </Button>
        {/* Staying is the safe default — it takes focus, so Enter keeps
            the edits rather than throwing them away. */}
        <Button onClick={onKeep} autoFocus>
          {t("keepEditing")}
        </Button>
      </div>
    </div>
  );
}
