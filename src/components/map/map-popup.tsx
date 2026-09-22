"use client";

import Link from "next/link";
import { Popup } from "react-map-gl/maplibre";
import { CalendarIcon, SkullIcon, BabyIcon } from "lucide-react";
import type { PlaceMarker } from "@/domain/place/place-marker.service";

/**
 * Click-content for a MapMarker — plain DOM rendered by react-map-gl's own
 * Popup (not a MapLibre-native popup), so it composes with ordinary
 * Tailwind/shadcn classes same as any other card in the app.
 */
export function MapPopup({
  marker,
  familySlug,
  onClose,
}: {
  marker: PlaceMarker;
  familySlug: string;
  onClose: () => void;
}) {
  const location = [marker.region, marker.country].filter(Boolean).join(", ");

  return (
    <Popup
      longitude={marker.longitude}
      latitude={marker.latitude}
      anchor="bottom"
      offset={16}
      onClose={onClose}
      closeButton={false}
      maxWidth="280px"
      className="[&_.maplibregl-popup-content]:rounded-xl [&_.maplibregl-popup-content]:border [&_.maplibregl-popup-content]:border-border [&_.maplibregl-popup-content]:bg-popover [&_.maplibregl-popup-content]:p-0 [&_.maplibregl-popup-content]:text-popover-foreground [&_.maplibregl-popup-content]:shadow-lg [&_.maplibregl-popup-tip]:!border-t-popover"
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-heading text-base font-medium">
            {marker.name}
          </span>
          {location && (
            <span className="text-xs text-muted-foreground">{location}</span>
          )}
        </div>

        {marker.people.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {marker.people.map((person) => (
              <li key={`${person.id}-${person.relation}`}>
                <Link
                  href={`/families/${familySlug}/people/${person.slug}`}
                  className="flex items-center gap-2 text-sm hover:text-primary hover:underline"
                >
                  {person.relation === "birth" ? (
                    <BabyIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <SkullIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  {person.name}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {marker.events.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {marker.events.map((event) => (
              <li
                key={event.id}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <CalendarIcon className="size-3.5 shrink-0" />
                <span>
                  {event.typeLabel}
                  {event.title ? ` · ${event.title}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}

        {marker.people.length === 0 && marker.events.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Пока ничего не привязано к этому месту.
          </p>
        )}
      </div>
    </Popup>
  );
}
