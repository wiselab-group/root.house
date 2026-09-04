"use client";

import { useTransition } from "react";
import { XIcon } from "lucide-react";
import { deleteMediaAction } from "@/actions/media.actions";
import { Button } from "@/components/ui/button";

/**
 * Small overlay control on a gallery photo — no confirm dialog (unlike
 * DeletePersonButton/RemoveRelationshipButton) since removing one photo from
 * a gallery is low-stakes and easily re-uploaded if clicked by mistake.
 */
export function DeleteMediaButton({
  familyId,
  personId,
  mediaId,
}: {
  familyId: string;
  personId: string;
  mediaId: string;
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
        startTransition(() => deleteMediaAction(familyId, personId, mediaId))
      }
    >
      <XIcon />
    </Button>
  );
}
