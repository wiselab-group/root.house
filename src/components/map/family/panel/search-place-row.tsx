"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CircleAlertIcon, MapPinIcon } from "lucide-react";
import type { MapPlace } from "@/domain/place/place-map.service";

const ROW =
  "-mx-2 flex min-h-11 w-[calc(100%+1rem)] cursor-pointer items-center gap-2.5 rounded-xl px-2 text-left transition-colors duration-base ease-(--ease-reveal) outline-none hover:bg-foreground/6 focus-visible:ring-2 focus-visible:ring-ring";

/** A place in the search list: on the map it opens the place; without a
 *  point it leads to where one can be set (editors) or just says so. */
export function SearchPlaceRow({
  place,
  peopleCount,
  canEdit,
  familySlug,
  onSelect,
}: {
  place: MapPlace;
  peopleCount: number;
  canEdit: boolean;
  familySlug: string;
  onSelect: () => void;
}) {
  const t = useTranslations("familyMap");
  const tc = useTranslations("counts");
  const onMap = place.latitude != null && place.longitude != null;
  const body = (
    <>
      {onMap ? (
        <MapPinIcon className="size-4 shrink-0 text-tree-accent" aria-hidden />
      ) : (
        <CircleAlertIcon className="size-4 shrink-0 text-primary" aria-hidden />
      )}
      <span className="flex-1 truncate text-sm font-medium">{place.name}</span>
      {onMap ? (
        <span className="text-xs text-muted-foreground">
          {peopleCount > 0 ? tc("people", { count: peopleCount }) : ""}
        </span>
      ) : (
        <span className="text-xs font-medium text-primary">
          {canEdit ? t("setPoint") : t("notOnMap")}
        </span>
      )}
    </>
  );
  return (
    <li>
      {onMap ? (
        <button type="button" className={ROW} onClick={onSelect}>
          {body}
        </button>
      ) : (
        <Link href={`/families/${familySlug}/places`} className={ROW}>
          {body}
        </Link>
      )}
    </li>
  );
}
