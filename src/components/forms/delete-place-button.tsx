"use client";

import { useTransition } from "react";
import { deletePlaceAction } from "@/actions/place.actions";
import { Button } from "@/components/ui/button";

export function DeletePlaceButton({ familyId, placeId }: { familyId: string; placeId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      aria-busy={isPending}
      className="text-muted-foreground hover:text-destructive"
      onClick={() => startTransition(() => deletePlaceAction(familyId, placeId))}
    >
      {isPending ? "Удаляем…" : "Удалить"}
    </Button>
  );
}
