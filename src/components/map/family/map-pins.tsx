"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Marker } from "react-map-gl/maplibre";
import { RouteIcon } from "lucide-react";
import { PlacePin, type PinTone } from "./place-pin";
import type { FamilyMapState } from "./use-family-map";

/** Every drawable place as a pin, toned by the moment and the lit path. */
export function MapPins({ state }: { state: FamilyMapState }) {
  const t = useTranslations("familyMap");
  const tc = useTranslations("counts");
  const { data, snapshot, focus, highlight, moment, setFocus } = state;

  const since = useMemo(() => {
    const first = new Map<string, number>();
    for (const s of data.model.stops) {
      if (s.year === null) continue;
      first.set(s.placeId, Math.min(first.get(s.placeId) ?? s.year, s.year));
    }
    return first;
  }, [data.model.stops]);

  const editing = focus.kind === "editPlace" ? focus.placeId : undefined;
  const pins = data.places.flatMap((place) => {
    if (place.latitude == null || place.longitude == null) return [];
    // The place being edited is drawn by its draggable draft pin instead.
    if (place.id === editing) return [];
    const presence = snapshot.places.get(place.id);
    let tone: PinTone;
    let badge: string | undefined;
    const pathIndex = highlight?.placeIds.indexOf(place.id) ?? -1;
    if (focus.kind === "place" && focus.placeId === place.id) {
      tone = "selected";
    } else if (highlight) {
      tone = pathIndex >= 0 ? "trace" : "dim";
      if (pathIndex >= 0 && highlight.numbered) badge = String(pathIndex + 1);
    } else if (presence) {
      tone = presence.state;
    } else if (moment === "all") {
      tone = "bare";
    } else {
      return [];
    }
    const count = presence?.personIds.length ?? 0;
    if (tone === "present" && count > 0) badge = String(count);
    const year = since.get(place.id);
    const hint = [
      count > 0 ? tc("people", { count }) : null,
      year !== undefined ? t("sinceYear", { year }) : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return [
      <PlacePin
        key={place.id}
        longitude={place.longitude}
        latitude={place.latitude}
        name={place.name}
        tone={tone}
        badge={badge}
        hint={hint || undefined}
        onSelect={() => setFocus({ kind: "place", placeId: place.id })}
      />,
    ];
  });

  return (
    <>
      {pins}
      {moment === "all" && focus.kind !== "person" && editing === undefined && (
        <RootTags state={state} />
      )}
    </>
  );
}

/** «корни · Купчик» under each branch's origin — a button into the branch. */
function RootTags({ state }: { state: FamilyMapState }) {
  const t = useTranslations("familyMap");
  const { data, setFocus, setHoveredBranch } = state;
  const placeById = new Map(data.places.map((p) => [p.id, p]));
  return data.branches.slice(0, 3).map((branch) => {
    const place = placeById.get(branch.originPlaceId);
    if (!place || place.latitude == null || place.longitude == null)
      return null;
    const label = branch.surname
      ? t("rootTag", { surname: branch.surname })
      : t("rootTagPlain");
    return (
      <Marker
        key={branch.rootId}
        longitude={place.longitude}
        latitude={place.latitude}
        anchor="top"
        offset={[0, 20]}
        onClick={(e) => {
          e.originalEvent.stopPropagation();
          setFocus({ kind: "branch", rootId: branch.rootId });
        }}
      >
        <button
          type="button"
          aria-label={t("showBranchPath", {
            name: branch.surname ?? place.name,
          })}
          onPointerEnter={() => setHoveredBranch(branch.rootId)}
          onPointerLeave={() => setHoveredBranch(null)}
          className="flex h-6 cursor-pointer items-center gap-1 rounded-full bg-branch pr-2.5 pl-2 text-[0.6875rem] font-semibold text-foreground shadow-md shadow-black/30 transition-transform duration-base ease-(--ease-spring) outline-none hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <RouteIcon className="size-3" aria-hidden />
          {label}
        </button>
      </Marker>
    );
  });
}
