"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Combobox } from "@base-ui/react/combobox";
import { SearchIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { personDisplayName } from "@/domain/person/display-name";
import { searchPeopleForTraceAction } from "@/actions/tree.actions";
import { RemovableChipList } from "./removable-chip-list";
import { PersonMultiComboboxPopup } from "./person-multi-combobox-popup";
import type { PersonSearchResult } from "@/domain/search/search.service";

/**
 * Search-as-you-type picker for TAGGING SEVERAL people on one photo (family
 * gallery upload) — same search-as-you-type input as tree/person-combobox.tsx's
 * PersonCombobox, built on the same @base-ui/react/combobox primitive, but
 * with `multiple` so a group photo can be tagged with everyone in it at
 * once. Selected people render as removable chips under the input rather
 * than filling the input's own text (which single-select does).
 *
 * Not placed under components/tree/ — this is a media-feature person
 * picker, not a tree-specific one (the "no @xyflow/react outside
 * components/tree/" rule doesn't apply here, this component uses neither).
 */
export function PersonMultiCombobox({
  familyId,
  label,
  value,
  onChange,
  className,
}: {
  familyId: string;
  label: string;
  value: { id: string; name: string }[];
  onChange: (people: { id: string; name: string }[]) => void;
  className?: string;
}) {
  const inputId = useId();
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Selected people may fall out of the latest search results (query
  // changed since they were picked) — pin them as items so Combobox can
  // still render them as selected even when they're not in `results`.
  const items = useMemo(() => {
    const missing = value.filter(
      (person) => !results.some((r) => r.id === person.id),
    );
    return [
      ...results,
      ...missing.map(
        (person) =>
          ({
            id: person.id,
            slug: "",
            firstName: person.name,
            lastName: null,
            maidenName: null,
            nickname: null,
            isPlaceholder: false,
            birthDate: null,
            deathDate: null,
            similarity: 0,
          }) satisfies PersonSearchResult,
      ),
    ];
  }, [results, value]);

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

  // Populate the full family list as soon as this control mounts, so
  // opening the popup shows everyone rather than an empty list.
  useEffect(() => {
    runSearch("");
    return () => abortControllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  const selectedValues = useMemo(
    () =>
      value
        .map((person) => items.find((item) => item.id === person.id))
        .filter((item): item is PersonSearchResult => item != null),
    [value, items],
  );

  function removePerson(id: string) {
    onChange(value.filter((person) => person.id !== id));
  }

  return (
    <Combobox.Root<PersonSearchResult, true>
      multiple
      items={items}
      filter={null}
      value={selectedValues}
      inputValue={query}
      itemToStringLabel={(person) => personDisplayName(person)}
      onValueChange={(people) => {
        onChange(
          people.map((person) => ({
            id: person.id,
            name: personDisplayName(person),
          })),
        );
      }}
      onInputValueChange={(nextValue, { reason }) => {
        if (reason === "item-press") return;
        setQuery(nextValue);
        runSearch(nextValue);
      }}
    >
      <div className={cn("flex flex-col gap-1.5", className)}>
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
        <Combobox.InputGroup className="relative flex h-11 items-center rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <SearchIcon className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground" />
          <Combobox.Input
            id={inputId}
            placeholder="Иванов, Анна, 1924…"
            className="h-full w-full min-w-0 rounded-lg bg-transparent py-1 pr-9 pl-10 text-base text-foreground outline-none placeholder:text-muted-foreground md:text-sm"
          />
          <Combobox.Clear
            className="absolute right-2 flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Очистить поиск"
          >
            <XIcon className="size-4" />
          </Combobox.Clear>
        </Combobox.InputGroup>

        <RemovableChipList items={value} onRemove={removePerson} />
      </div>

      <PersonMultiComboboxPopup isPending={isPending} query={query} />
    </Combobox.Root>
  );
}
