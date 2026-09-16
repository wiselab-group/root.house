"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { personDisplayName } from "@/domain/person/display-name";
import { searchPeopleForTraceAction } from "@/actions/tree.actions";
import type { PersonSearchResult } from "@/domain/search/search.service";

/**
 * Compact single-select person picker for the photo-tag popover
 * (photo-tag-layer.tsx) — trimmed version of tree/person-combobox.tsx: no
 * persistent label, no controlled value/clear affordance, fires onSelect
 * immediately once a person is picked so the caller can close the popover
 * right away. Already-tagged people are NOT excluded from results —
 * re-selecting one just moves their existing point (server-side upsert).
 */
export function TagPersonCombobox({
  familyId,
  onSelect,
  autoFocus,
  className,
}: {
  familyId: string;
  onSelect: (person: { id: string; name: string }) => void;
  autoFocus?: boolean;
  className?: string;
}) {
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const abortControllerRef = useRef<AbortController | null>(null);

  function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();

    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;

    startTransition(async () => {
      const found = await searchPeopleForTraceAction(familyId, trimmed);
      if (controller.signal.aborted) return;
      setResults(found);
    });
  }

  useEffect(() => {
    runSearch("");
    return () => abortControllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  return (
    <Combobox.Root<PersonSearchResult>
      items={results}
      filter={null}
      value={null}
      inputValue={query}
      itemToStringLabel={(person) => personDisplayName(person)}
      onValueChange={(person) => {
        if (!person) return;
        onSelect({ id: person.id, name: personDisplayName(person) });
      }}
      onInputValueChange={(nextValue, { reason }) => {
        if (reason === "item-press") return;
        setQuery(nextValue);
        runSearch(nextValue);
      }}
    >
      <div className={cn("flex flex-col gap-1.5", className)}>
        <Combobox.InputGroup className="relative flex h-10 items-center rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <SearchIcon className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
          <Combobox.Input
            autoFocus={autoFocus}
            placeholder="Кто это?"
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
                {!isPending
                  ? query.trim().length > 0
                    ? "Ничего не найдено."
                    : "В семье пока никого нет."
                  : null}
              </Combobox.Empty>
              <Combobox.List>
                {(person: PersonSearchResult) => (
                  <Combobox.Item
                    key={person.id}
                    value={person}
                    className="flex cursor-default items-center rounded-md px-2 py-2 text-left text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    {personDisplayName(person)}
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
