"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteAlbumAction } from "@/actions/album.actions";
import { Button } from "@/components/ui/button";

/**
 * Deletes the album itself (never its photos — see deleteAlbumAction's doc
 * comment). Navigates back to /photos afterward since the current
 * /photos/[albumId] page stops existing once the album is gone.
 */
export function DeleteAlbumButton({
  familyId,
  familySlug,
  albumId,
}: {
  familyId: string;
  familySlug: string;
  albumId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      aria-busy={isPending}
      className="text-muted-foreground hover:text-destructive"
      onClick={() =>
        startTransition(async () => {
          await deleteAlbumAction(familyId, albumId);
          router.push(`/families/${familySlug}/photos`);
        })
      }
    >
      {isPending ? "Удаляем…" : "Удалить альбом"}
    </Button>
  );
}
