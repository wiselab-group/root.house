"use client";

import { Combobox } from "@base-ui/react/combobox";
import { GlobeIcon, MapPinIcon, PlusIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  placeOptionDetail,
  type PlaceOption,
  type PlaceOptionGroup,
} from "./place-field-options";

const OPTION_ICONS: Record<PlaceOption["kind"], LucideIcon> = {
  saved: MapPinIcon,
  map: GlobeIcon,
  typed: PlusIcon,
};

/** PlaceField's dropdown — grouped «В архиве семьи» / «Найти на карте» / «Добавить». */
export function PlaceFieldPopup({
  isSearching,
  showEmpty,
}: {
  isSearching: boolean;
  showEmpty: boolean;
}) {
  return (
    <Combobox.Portal>
      <Combobox.Positioner className="isolate z-50 outline-none" sideOffset={4}>
        <Combobox.Popup
          className={cn(
            "w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          )}
          aria-busy={isSearching || undefined}
        >
          <div className="max-h-72 overflow-y-auto overscroll-contain p-1 scroll-pt-1 scroll-pb-1">
            <Combobox.Empty className="px-2 py-2 text-sm text-muted-foreground empty:hidden">
              {isSearching
                ? "Ищем на карте…"
                : showEmpty
                  ? "Ничего не найдено."
                  : "Начните вводить название места."}
            </Combobox.Empty>
            <Combobox.List>
              {(group: PlaceOptionGroup) => (
                <Combobox.Group
                  key={group.value}
                  items={group.items}
                  className="not-first:mt-1 not-first:border-t not-first:border-border not-first:pt-1"
                >
                  {group.label && (
                    <Combobox.GroupLabel className="px-2 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">
                      {group.label}
                      {group.value === "map" && isSearching ? " · ищем…" : ""}
                    </Combobox.GroupLabel>
                  )}
                  <Combobox.Collection>
                    {(option: PlaceOption) => (
                      <PlaceFieldOption key={option.key} option={option} />
                    )}
                  </Combobox.Collection>
                </Combobox.Group>
              )}
            </Combobox.List>
          </div>
        </Combobox.Popup>
      </Combobox.Positioner>
    </Combobox.Portal>
  );
}

function PlaceFieldOption({ option }: { option: PlaceOption }) {
  const Icon = OPTION_ICONS[option.kind];
  const detail = placeOptionDetail(option);
  const title =
    option.kind === "saved"
      ? option.place.name
      : option.kind === "map"
        ? option.result.name
        : `Добавить «${option.name}»`;
  return (
    <Combobox.Item
      value={option}
      className="flex cursor-default items-start gap-2.5 rounded-md px-2 py-2 text-left text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
    >
      <Icon
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{title}</span>
        {detail && (
          <span className="truncate text-xs text-muted-foreground">
            {detail}
          </span>
        )}
      </span>
    </Combobox.Item>
  );
}
