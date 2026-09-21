"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { SearchIcon, XIcon } from "lucide-react";
import { searchPeopleForTraceAction } from "@/actions/tree.actions";
import { personDisplayName } from "@/domain/person/display-name";
import { PersonMultiComboboxPopup } from "@/components/media/person-multi-combobox-popup";
import { Label } from "@/components/ui/label";
import type { PersonSearchResult } from "@/domain/search/search.service";

/**
 * The search-as-you-type input + popup portion of EventParticipantsField —
 * split out to keep the parent under the project's 150-line component
 * guideline, same reasoning as PersonMultiComboboxPopup. `excludeIds` keeps
 * already-added participants out of the results (fetched fresh, not
 * filtered from a stale list, so this re-searches on every `excludeIds`
 * change — acceptable since the family-wide result set is small).
 */
export function EventParticipantSearch({
  familyId,
  excludeIds,
  onPick,
}: {
  familyId: string;
  excludeIds: string[];
  onPick: (person: PersonSearchResult) => void;
}) {
  const inputId = useId();
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const abortControllerRef = useRef<AbortController | null>(null);

  function runSearch(nextQuery: string) {
    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;
    startTransition(async () => {
      const found = await searchPeopleForTraceAction(
        familyId,
        nextQuery.trim(),
      );
      if (controller.signal.aborted) return;
      setResults(found);
    });
  }

  useEffect(() => {
    runSearch("");
    return () => abortControllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  const selectableItems = results.filter((r) => !excludeIds.includes(r.id));

  return (
    <Combobox.Root<PersonSearchResult>
      items={selectableItems}
      filter={null}
      // Always null — this field never holds a "current selection" of its
      // own (each pick fires onPick and resets, see below), same pattern as
      // TagPersonCombobox.
      value={null}
      inputValue={query}
      itemToStringLabel={(person) => personDisplayName(person)}
      onValueChange={(person) => {
        if (!person) return;
        onPick(person);
        // Reset after a pick — this field stays mounted for adding more
        // people (unlike TagPersonCombobox, which closes its popover), so
        // leaving the picked name in the input would stale the next search.
        setQuery("");
        runSearch("");
      }}
      onInputValueChange={(nextValue, { reason }) => {
        if (reason === "item-press") return;
        setQuery(nextValue);
        runSearch(nextValue);
      }}
    >
      <Label htmlFor={inputId} className="text-sm font-medium">
        Участники
      </Label>
      <Combobox.InputGroup className="relative mt-1.5 flex h-11 items-center rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        <SearchIcon className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground" />
        <Combobox.Input
          id={inputId}
          placeholder="Добавить участника…"
          className="h-full w-full min-w-0 rounded-lg bg-transparent py-1 pr-9 pl-10 text-base text-foreground outline-none placeholder:text-muted-foreground md:text-sm"
        />
        <Combobox.Clear
          className="absolute right-2 flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Очистить поиск"
        >
          <XIcon className="size-4" />
        </Combobox.Clear>
      </Combobox.InputGroup>
      <PersonMultiComboboxPopup isPending={isPending} query={query} />
    </Combobox.Root>
  );
}
