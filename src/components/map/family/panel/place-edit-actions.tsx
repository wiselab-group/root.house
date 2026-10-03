"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { deletePlaceAction } from "@/actions/place.actions";
import { Button } from "@/components/ui/button";
import type { MapPlace } from "@/domain/place/place-map.service";
import type { FamilyMapState } from "../use-family-map";

function SaveButton({ isNew }: { isNew: boolean }) {
  const tc = useTranslations("common");
  const tf = useTranslations("placeForm");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending
        ? isNew
          ? tf("adding")
          : tc("saving")
        : isNew
          ? tf("add")
          : tc("save")}
    </Button>
  );
}

/**
 * Save / cancel, and — for a saved place — delete behind an inline
 * confirmation in the panel itself (no modal over the map: the user keeps
 * seeing which pin goes away).
 */
export function PlaceEditActions({
  state,
  place,
  onCancel,
}: {
  state: FamilyMapState;
  place: MapPlace | null;
  onCancel: () => void;
}) {
  const t = useTranslations("familyMap");
  const tc = useTranslations("common");
  const [confirming, setConfirming] = useState(false);
  const [deleting, startDelete] = useTransition();
  const router = useRouter();

  if (confirming && place) {
    return (
      <div className="mt-auto flex flex-col gap-3 rounded-2xl border border-destructive/40 p-3.5">
        <p className="text-sm">{t("deleteConfirm", { name: place.name })}</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            aria-busy={deleting}
            onClick={() =>
              startDelete(async () => {
                await deletePlaceAction(state.familyId, place.id);
                state.setFocus({ kind: "overview" });
                // The action revalidates the map, but the panel also rewrites
                // the URL in the same tick — refresh explicitly so the pin
                // can't outlive its place (seen flaky in the browser check).
                router.refresh();
              })
            }
          >
            {deleting ? tc("deleting") : tc("delete")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={deleting}
            onClick={() => setConfirming(false)}
          >
            {tc("cancel")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
      <SaveButton isNew={!place} />
      <Button type="button" variant="ghost" onClick={onCancel}>
        {tc("cancel")}
      </Button>
      {place && (
        <Button
          type="button"
          variant="ghost"
          className="ml-auto text-muted-foreground hover:text-destructive"
          onClick={() => setConfirming(true)}
        >
          {tc("delete")}
        </Button>
      )}
    </div>
  );
}
