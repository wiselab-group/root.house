"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  createPlaceAction,
  updatePlaceAction,
  type PlaceFormState,
} from "@/actions/place.actions";
import { PlaceGeocodeCombobox } from "@/components/forms/place-geocode-combobox";
import { Label } from "@/components/ui/label";
import { BackButton } from "./panel-bits";
import { PlacePointLine } from "./place-point-line";
import { PlaceEditActions } from "./place-edit-actions";
import { PlaceEditFields, type PlaceNameFields } from "./place-edit-fields";
import type { FamilyMapState } from "../use-family-map";

const initial: PlaceFormState = {};

/**
 * A place added or edited on the family map itself (phase 4 — the old
 * /places page now redirects here). The map is the point picker: a click
 * drops the pin, dragging moves it, an address search flies there and fills
 * the empty name/region/country. Saving opens the place's sheet.
 */
export function PlaceEditPanel({
  state,
  placeId,
}: {
  state: FamilyMapState;
  placeId: string | null;
}) {
  const t = useTranslations("familyMap");
  const tf = useTranslations("placeForm");
  const { data, familyId, setFocus, draft } = state;
  const place = placeId ? data.places.find((p) => p.id === placeId) : undefined;
  const [fields, setFields] = useState<PlaceNameFields>({
    name: place?.name ?? "",
    region: place?.region ?? "",
    country: place?.country ?? "",
  });
  const action = placeId
    ? updatePlaceAction.bind(null, familyId, placeId)
    : createPlaceAction.bind(null, familyId);
  const [result, formAction] = useActionState(action, initial);
  const submitted = useRef(false);
  const back = () =>
    setFocus(placeId ? { kind: "place", placeId } : { kind: "search" });

  useEffect(() => {
    if (!submitted.current || !result.placeId) return;
    submitted.current = false;
    // With a point, open the place's sheet; without one it isn't on the
    // map yet — back to the list, where it waits under «Не на карте».
    setFocus(
      draft.point
        ? { kind: "place", placeId: result.placeId }
        : { kind: "search" },
    );
  }, [result, draft.point, setFocus]);

  return (
    <form
      action={(formData) => {
        submitted.current = true;
        formAction(formData);
      }}
      className="flex min-h-full flex-col gap-4"
    >
      <BackButton onClick={back} />
      <h2 className="-mt-2 font-heading text-2xl font-medium">
        {placeId ? tf("edit") : t("newPlace")}
      </h2>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">
          {tf("mapPoint")}
        </Label>
        <PlaceGeocodeCombobox
          onSelect={(hit) => {
            draft.pickFromSearch({
              latitude: hit.latitude,
              longitude: hit.longitude,
            });
            setFields((f) => ({
              name: f.name.trim() || hit.name,
              region: f.region.trim() || (hit.region ?? ""),
              country: f.country.trim() || (hit.country ?? ""),
            }));
          }}
        />
        <PlacePointLine draft={draft} />
        <input
          type="hidden"
          name="latitude"
          value={draft.point?.latitude ?? ""}
        />
        <input
          type="hidden"
          name="longitude"
          value={draft.point?.longitude ?? ""}
        />
        {result.fieldErrors?.latitude && (
          <p className="text-sm text-destructive">
            {result.fieldErrors.latitude}
          </p>
        )}
      </div>

      <PlaceEditFields
        values={fields}
        onChange={setFields}
        description={place?.description ?? ""}
        nameError={result.fieldErrors?.name}
      />

      {result.error && (
        <p className="text-sm text-destructive">{result.error}</p>
      )}
      <PlaceEditActions state={state} place={place ?? null} onCancel={back} />
    </form>
  );
}
