"use client";

import { useCallback, useRef } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { snapshotAt } from "@/domain/place/map-snapshot";
import type { FamilyMapData } from "@/domain/place/place-map.service";
import { MapView } from "../map-view";
import { MapPins } from "./map-pins";
import { LocationPin } from "../location-pin";
import { RouteLayer } from "./route-layer";
import { MapPanel } from "./panel/map-panel";
import { InviteButton } from "./timeline/invite-button";
import { MapBottomBar } from "./timeline/map-bottom-bar";
import { useFamilyMap, type MapFocus } from "./use-family-map";
import { useMapCamera } from "./use-map-camera";
import { useDetailLayers } from "./use-detail-layers";
import { useMapTheme } from "./use-map-theme";
import type { MapThemeId } from "@/lib/map-theme/map-theme";
import { ThemeSwitcher } from "./theme-switcher";
import { usePlayback } from "./use-playback";

/** Before the first fit — roughly Eastern Europe, where the archives are. */
const START_VIEW = { longitude: 25, latitude: 51, zoom: 3.5 };

/**
 * The family map, full-bleed like the tree: the whole family's places on
 * open, a side panel (overview → search / place / branch / person) and a
 * bottom timeline that plays how the family got here. Loaded client-only
 * (MapLibre touches window at import) via family-map-loader.tsx.
 */
export function FamilyMap({
  data,
  familyId,
  familySlug,
  canEdit,
  initialFocus,
  initialTheme,
}: {
  data: FamilyMapData;
  familyId: string;
  familySlug: string;
  canEdit: boolean;
  initialFocus: MapFocus;
  initialTheme: MapThemeId;
}) {
  const state = useFamilyMap(data, initialFocus, {
    familyId,
    familySlug,
    canEdit,
  });
  const reducedMotion = useReducedMotion();
  const mapRef = useRef<MapRef>(null);
  const { onLoad, fitAll } = useMapCamera(mapRef, state, reducedMotion);
  const { range, moment, setMoment, setFocus, playing, setPlaying, draft } =
    state;
  const editing = state.focus.kind === "editPlace";
  useDetailLayers(mapRef, editing);
  const { themeId, setThemeId, theme } = useMapTheme(initialTheme, data.places);
  const { play, pause } = usePlayback(
    range,
    moment,
    setMoment,
    playing,
    setPlaying,
    reducedMotion,
  );

  // The story is the whole family's: frame everyone before it starts, or a
  // place zoomed into earlier would hide every move but its own.
  const startStory = useCallback(() => {
    setFocus({ kind: "overview" });
    fitAll(!reducedMotion, true);
    play();
  }, [fitAll, play, reducedMotion, setFocus]);
  const jump = useCallback(
    (year: number) => {
      pause();
      setMoment(year);
    },
    [pause, setMoment],
  );
  const allTime = useCallback(() => {
    pause();
    setMoment("all");
  }, [pause, setMoment]);

  const allStats = snapshotAt(data.model, "all").stats;
  const invite = (className: string) =>
    range ? (
      <InviteButton
        range={range}
        stats={allStats}
        onPlay={startStory}
        className={className}
      />
    ) : null;

  return (
    <div className="relative h-[calc(100svh-4.5rem)] w-full overflow-hidden bg-tree-canvas">
      <MapView
        ref={mapRef}
        initialLongitude={START_VIEW.longitude}
        initialLatitude={START_VIEW.latitude}
        initialZoom={START_VIEW.zoom}
        onLoad={onLoad}
        theme={theme}
        showZoom={false}
        // Editing a place: the family map itself is the point picker.
        onMapClick={editing ? draft.pickOnMap : undefined}
        cursor={editing ? "crosshair" : undefined}
      >
        <RouteLayer state={state} theme={themeId} />
        <MapPins state={state} />
        {editing && draft.point && (
          <LocationPin {...draft.point} onMove={draft.pickOnMap} />
        )}
      </MapView>

      <ThemeSwitcher value={themeId} onChange={setThemeId} />

      <MapPanel
        state={state}
        onPlay={range ? startStory : null}
        onJump={jump}
      />

      {range && (
        <MapBottomBar
          state={state}
          range={range}
          invite={invite(
            "pointer-events-auto hidden border border-glass-edge bg-background/75 py-2 pr-6 pl-2 shadow-xl shadow-black/40 backdrop-blur-xl md:pointer-fine:flex",
          )}
          playing={playing}
          onPlay={play}
          onPause={pause}
          onScrub={jump}
          onAllTime={allTime}
        />
      )}
    </div>
  );
}
