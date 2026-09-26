"use client";

import { useTransition } from "react";
import { CheckIcon, UserRoundIcon } from "lucide-react";
import { setPersonPortraitAction } from "@/actions/media.actions";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

/**
 * «Сделать портретом» in PhotoTileMenu (a Person's own gallery only) — or a
 * disabled «Это портрет» on the photo that already is. Split out of
 * PhotoTileMenu to keep it under CLAUDE.md's 150-line ceiling.
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
  const [isPending, startTransition] = useTransition();

  if (isCurrent) {
    return (
      <DropdownMenuItem disabled>
        <CheckIcon />
        Это портрет
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
      Сделать портретом
    </DropdownMenuItem>
  );
}
