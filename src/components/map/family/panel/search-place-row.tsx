"use client";

import { useTranslations } from "next-intl";
import { CircleAlertIcon, MapPinIcon } from "lucide-react";
import type { MapPlace } from "@/domain/place/place-map.service";

const ROW =
  "-mx-2 flex min-h-11 w-[calc(100%+1rem)] cursor-pointer items-center gap-2.5 rounded-xl px-2 text-left transition-colors duration-base ease-(--ease-reveal) outline-none hover:bg-foreground/6 focus-visible:ring-2 focus-visible:ring-ring";

/** A place in the search list: on the map it opens the place; without a
 *  point it opens the place's edit to set one (editors) or just says so. */
export function SearchPlaceRow({
  place,
  peopleCount,
  canEdit,
  onSelect,
  onEdit,
}: {
  place: MapPlace;
  peopleCount: number;
  canEdit: boolean;
  onSelect: () => void;
  /** «Поставить точку» — opens the place's edit on the map. */
  onEdit: () => void;
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
  if (!onMap && !canEdit) {
    return <li className={ROW.replace("cursor-pointer", "")}>{body}</li>;
  }
  return (
    <li>
      <button type="button" className={ROW} onClick={onMap ? onSelect : onEdit}>
        {body}
      </button>
    </li>
  );
}
