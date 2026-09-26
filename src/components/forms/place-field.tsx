"use client";

import { useId, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { MapPinIcon, XIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import type { PlaceRecord } from "@/domain/place/place.service";
import {
  buildPlaceOptionGroups,
  selectionFromOption,
  selectionName,
  type PlaceOption,
  type PlaceSelection,
} from "./place-field-options";
import { PlaceFieldPopup } from "./place-field-popup";
import { useGeocodeSearch } from "./use-geocode-search";

/**
 * The one place picker for every form that asks «где?» (birth/death/
 * residence, an event's place): type a name and pick either a place the
 * family already has, a map search result, or «add as typed» for a place
 * the map doesn't know. A new place is posted as JSON in `<name>Draft` and
 * saved by the form's own action (lib/place-choice.ts) — no detour through
 * the Places page first. A saved place is posted as its id in `<name>`.
 *
 * Unfinished typing is discarded when the dropdown closes — the input
 * always snaps back to what's actually selected, so the text never claims
 * a place the form won't submit.
 */
export function PlaceField({
  name,
  label,
  places,
  defaultValue,
}: {
  name: string;
  label: string;
  places: PlaceRecord[];
  defaultValue?: string | null;
}) {
  const inputId = useId();
  const [selection, setSelection] = useState<PlaceSelection | null>(() => {
    const place = places.find((item) => item.id === defaultValue);
    return place ? { kind: "saved", place } : null;
  });
  const [query, setQuery] = useState(() => selectionName(selection));
  const map = useGeocodeSearch();
  const groups = buildPlaceOptionGroups(places, query, map.results);

  function select(next: PlaceSelection | null) {
    setSelection(next);
    setQuery(selectionName(next));
    map.search("");
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Combobox.Root<PlaceOption>
        items={groups}
        filter={null}
        value={null}
        inputValue={query}
        itemToStringLabel={(option) =>
          selectionName(selectionFromOption(option))
        }
        onValueChange={(option) => {
          if (option) select(selectionFromOption(option));
        }}
        onInputValueChange={(next, { reason }) => {
          // Only the user's own typing counts. base-ui also rewrites the
          // text itself — e.g. an "input-clear" to "" on the field the
          // user just left, since its internal value is always null —
          // and treating that as «cleared» silently dropped the selection
          // while the input kept showing the place's name.
          if (reason !== "input-change") return;
          setQuery(next);
          map.search(next);
          if (next.trim() === "") setSelection(null);
        }}
        onOpenChange={(open, { reason }) => {
          // Picking an item closes the popup in the same event that
          // select() runs in — `selection` here is still the previous one,
          // and resetting to it would wipe the just-picked name.
          if (!open && reason !== "item-press") {
            setQuery(selectionName(selection));
          }
        }}
      >
        <Combobox.InputGroup className="relative flex h-11 items-center rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
          <MapPinIcon className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground" />
          <Combobox.Input
            id={inputId}
            placeholder="Город, село, адрес…"
            className="h-full w-full min-w-0 rounded-lg bg-transparent py-1 pr-10 pl-10 text-base text-foreground outline-none placeholder:text-muted-foreground md:text-sm"
          />
          {selection && (
            <button
              type="button"
              onClick={() => select(null)}
              aria-label={`Очистить: ${label.toLowerCase()}`}
              className="absolute right-2 flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-95"
            >
              <XIcon className="size-4" aria-hidden="true" />
            </button>
          )}
        </Combobox.InputGroup>
        <PlaceFieldPopup
          isSearching={map.isSearching}
          showEmpty={query.trim().length >= 2}
        />
      </Combobox.Root>
      <input
        type="hidden"
        name={name}
        value={selection?.kind === "saved" ? selection.place.id : ""}
      />
      <input
        type="hidden"
        name={`${name}Draft`}
        value={
          selection?.kind === "draft" ? JSON.stringify(selection.draft) : ""
        }
      />
    </div>
  );
}
