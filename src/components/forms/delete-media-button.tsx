"use client";

import { useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { deleteMediaAction } from "@/actions/media.actions";
import { Button } from "@/components/ui/button";

/**
 * Small overlay control on a gallery photo — no confirm dialog (unlike
 * DeletePersonButton/RemoveRelationshipButton) since removing one photo from
 * a gallery is low-stakes and easily re-uploaded if clicked by mistake. Uses
 * a trash icon (not an X) so it's never confused with a nearby close button
 * — PhotoLightbox renders this right next to its own X close control.
 */
export function DeleteMediaButton({
  familyId,
  familySlug,
  mediaId,
  personId,
}: {
  familyId: string;
  familySlug: string;
  mediaId: string;
  /** Pass when deleting from a specific person's profile gallery — omit on the family-wide gallery, where a photo may be untagged or tagged to several people. */
  personId?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon-xs"
      aria-label="Удалить фото"
      disabled={isPending}
      className="rounded-full shadow-sm"
      onClick={() =>
        startTransition(() =>
          deleteMediaAction(familyId, familySlug, mediaId, personId),
        )
      }
    >
      <Trash2Icon />
    </Button>
  );
}
