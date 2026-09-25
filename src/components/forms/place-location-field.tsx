"use client";

import { useEffect, useRef, useState } from "react";
import { XIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { LocationPickerMapLoader } from "@/components/map/location-picker-map-loader";
import { reverseGeocode, type GeocodeResult } from "@/lib/maptiler-geocode";
import { PlaceGeocodeCombobox } from "./place-geocode-combobox";

type LatLng = { latitude: number; longitude: number };

/**
 * «Точка на карте» for the create/edit Place forms: find the place by
 * address, OR pick it on the map (user request) — a click drops the pin,
 * dragging moves it. The two stay in sync: a search result flies the map
 * to it; a pin placed by hand looks up its address (MapTiler reverse
 * geocoding) and shows it in the search box. The form only ever reads the
 * hidden latitude/longitude inputs.
 */
export function PlaceLocationField({
  defaultPoint = null,
  error,
}: {
  defaultPoint?: LatLng | null;
  error?: string;
}) {
  const [point, setPoint] = useState<LatLng | null>(defaultPoint);
  const [flyToken, setFlyToken] = useState(0);
  // The search box keeps its own text; bumping this remounts it with a new
  // label after a pin was placed on the map.
  const [label, setLabel] = useState(() =>
    defaultPoint ? formatPoint(defaultPoint) : "",
  );
  const [labelKey, setLabelKey] = useState(0);
  const lookupRef = useRef<AbortController | null>(null);

  function showLabel(next: string) {
    setLabel(next);
    setLabelKey((key) => key + 1);
  }

  function lookUpAddress(at: LatLng) {
    lookupRef.current?.abort();
    const controller = new AbortController();
    lookupRef.current = controller;
    void reverseGeocode(at.latitude, at.longitude, controller.signal).then(
      (address) => {
        if (address && !controller.signal.aborted) showLabel(address);
      },
    );
  }

  // An already-saved point shows its address, not bare coordinates.
  useEffect(() => {
    if (defaultPoint) lookUpAddress(defaultPoint);
    return () => lookupRef.current?.abort();
    // Once, for the point the form opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickOnMap(next: LatLng) {
    setPoint(next);
    showLabel(formatPoint(next));
    lookUpAddress(next);
  }

  function pickFromSearch(result: GeocodeResult) {
    lookupRef.current?.abort();
    setPoint({ latitude: result.latitude, longitude: result.longitude });
    setFlyToken((token) => token + 1);
    // The combobox clears its own text once its (always-null) value settles;
    // show the chosen address explicitly, like after a pin on the map.
    showLabel(result.label);
  }

  function clear() {
    lookupRef.current?.abort();
    setPoint(null);
    showLabel("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">
        Точка на карте (необязательно)
      </Label>
      <PlaceGeocodeCombobox
        key={labelKey}
        defaultLabel={label}
        onSelect={pickFromSearch}
      />
      <LocationPickerMapLoader
        point={point}
        flyToken={flyToken}
        onPick={pickOnMap}
      />
      {point && (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">{formatPoint(point)}</span>
          <button
            type="button"
            onClick={clear}
            className="inline-flex cursor-pointer items-center gap-1 rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <XIcon className="size-3.5" aria-hidden="true" />
            Убрать точку
          </button>
        </div>
      )}
      <input type="hidden" name="latitude" value={point?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={point?.longitude ?? ""} />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function formatPoint(point: LatLng): string {
  return `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`;
}
