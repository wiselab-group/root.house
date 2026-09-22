"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { MapPinIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { geocodePlace, type GeocodeResult } from "@/lib/maptiler-geocode";

/**
 * Address search box backed by MapTiler Geocoding — lets a Place form
 * resolve latitude/longitude from a free-text search instead of asking the
 * user to know raw coordinates. Same single-select Combobox shape as
 * media/tag-person-combobox.tsx, swapping the person-search server action
 * for a direct client-side MapTiler fetch (see lib/maptiler-geocode.ts).
 * Purely additive to a Place form: selecting a result fills hidden
 * latitude/longitude inputs via onSelect, the place's `name` field is left
 * for the user to fill in themselves (the search result's own label often
 * includes region/country the name field doesn't want duplicated).
 */
export function PlaceGeocodeCombobox({
  onSelect,
  defaultLabel,
  className,
}: {
  onSelect: (result: GeocodeResult) => void;
  defaultLabel?: string;
  className?: string;
}) {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [query, setQuery] = useState(defaultLabel ?? "");
  const [isPending, startTransition] = useTransition();
  const abortControllerRef = useRef<AbortController | null>(null);

  function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();
    abortControllerRef.current?.abort();

    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    startTransition(async () => {
      const found = await geocodePlace(trimmed, controller.signal).catch(
        () => [],
      );
      if (controller.signal.aborted) return;
      setResults(found);
    });
  }

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  return (
    <Combobox.Root<GeocodeResult>
      items={results}
      filter={null}
      value={null}
      inputValue={query}
      itemToStringLabel={(result) => result.label}
      onValueChange={(result) => {
        if (!result) return;
        setQuery(result.label);
        onSelect(result);
      }}
      onInputValueChange={(nextValue, { reason }) => {
        if (reason === "item-press") return;
        setQuery(nextValue);
        runSearch(nextValue);
      }}
    >
      <div className={cn("flex flex-col gap-1.5", className)}>
        <Combobox.InputGroup className="relative flex h-10 items-center rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <MapPinIcon className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
          <Combobox.Input
            placeholder="Найти на карте…"
            className="h-full w-full min-w-0 rounded-lg bg-transparent py-1 pr-3 pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </Combobox.InputGroup>
      </div>

      <Combobox.Portal>
        <Combobox.Positioner
          className="isolate z-50 outline-none"
          sideOffset={4}
        >
          <Combobox.Popup
            className={cn(
              "w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            )}
            aria-busy={isPending || undefined}
          >
            <div className="max-h-60 overflow-y-auto overscroll-contain p-1 scroll-pt-1 scroll-pb-1">
              <Combobox.Status className="px-2 py-2 text-sm text-muted-foreground empty:hidden">
                {isPending ? "Ищем…" : null}
              </Combobox.Status>
              <Combobox.Empty className="px-2 py-2 text-sm text-muted-foreground empty:hidden">
                {!isPending && query.trim().length >= 2
                  ? "Ничего не найдено."
                  : null}
              </Combobox.Empty>
              <Combobox.List>
                {(result: GeocodeResult) => (
                  <Combobox.Item
                    key={result.id}
                    value={result}
                    className="flex cursor-default items-center rounded-md px-2 py-2 text-left text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    {result.label}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </div>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
