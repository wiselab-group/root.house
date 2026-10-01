"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { CheckIcon, UserRoundIcon } from "lucide-react";
import { setPersonPortraitAction } from "@/actions/media.actions";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

/**
 * «Сделать портретом» in PhotoActionsMenu (a Person's own gallery only) — or a
 * disabled «Это портрет» on the photo that already is. Split out of
 * PhotoActionsMenu to keep it under CLAUDE.md's 150-line ceiling.
 */
export function PortraitMenuItem({
  familyId,
  familySlug,
  mediaId,
  personId,
  isCurrent,
}: {
  familyId: string;
  familySlug: string;
  mediaId: string;
  personId: string;
  isCurrent: boolean;
}) {
  const t = useTranslations("media");
  const [isPending, startTransition] = useTransition();

  // A state, not an unavailable action: still inert, but at full strength
  // with a sage check instead of the disabled fade (user request
  // 2026-10-01). Sage is --tree-accent, the "this is the person" identity
  // color — not --confirm, which stays reserved for «Готово». The label
  // goes sage only on the dark menu: on the light one it's ~4.3:1, under AA.
  // A faint sage wash across the full row marks it as the chosen one; being
  // inert, it has no hover change.
  if (isCurrent) {
    return (
      <DropdownMenuItem
        disabled
        className="bg-tree-accent/15 data-disabled:opacity-100 dark:text-tree-accent [&_svg]:text-tree-accent"
      >
        <CheckIcon />
        {t("isPortrait")}
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await setPersonPortraitAction(
            familyId,
            familySlug,
            personId,
            mediaId,
          );
        })
      }
    >
      <UserRoundIcon />
      {t("makePortrait")}
    </DropdownMenuItem>
  );
}
