"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { SearchIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { personDisplayName } from "@/domain/person/display-name";
import { formatPartialDate } from "@/domain/shared/partial-date";
import { searchPeopleForTraceAction } from "@/actions/tree.actions";
import type { PersonSearchResult } from "@/domain/search/search.service";

/**
 * Inline search-as-you-type picker for a single Person — input and results
 * list are the same control (no separate picker dialog hop), so picking
 * Person A/B for Relationship Trace stays inside TreeTracePanel. Selection
 * is a controlled { id, name } pair so the caller (TreeToolbar) still owns
 * the URL param as the source of truth.
 *
 * `excludeId` drops one person (typically whoever is already selected in
 * the other slot) from the results — comparing A to itself isn't a
 * meaningful trace, so Person B's list must not offer whoever is Person A.
 *
 * `value` is owned by the caller (the URL param), but writing it goes
 * through router.push — a real navigation that lands one render tick later
 * — so mirroring `value` straight into Combobox.Root's `value` would make
 * the input visibly lag behind every pick/clear. Combobox.Root's value is
 * driven off local `localValue` instead, set immediately on
 * pick/clear and resynced from the prop only when it actually changes, so
 * the input updates the instant the user acts and the prop remains the
 * eventual source of truth.
 */
export function PersonCombobox({
  familyId,
  label,
  value,
  onChange,
  excludeId,
  className,
}: {
  familyId: string;
  label: string;
  value: { id: string; name: string } | null;
  onChange: (person: { id: string; name: string } | null) => void;
  excludeId?: string;
  className?: string;
}) {
  const inputId = useId();
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [query, setQuery] = useState(value?.name ?? "");
  const [localValue, setLocalValue] = useState(value);
  const [isPending, startTransition] = useTransition();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Resync from the prop the moment it changes — adjusting state during
  // render (rather than in a useEffect) avoids an extra commit, per React's
  // "you might not need an effect" guidance for controlled-with-local-
  // override state. `prevValue` is the previous render's prop snapshot;
  // when the incoming prop no longer matches it, the prop has moved (URL
  // navigation completed, or the value changed from outside this component,
  // e.g. the other slot's excludeId making this one stale) and localValue
  // (plus the input's displayed text, `query` — see the `inputValue` prop
  // below) resets to match it.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setLocalValue(value);
    setQuery(value?.name ?? "");
  }

  // The selected person may fall out of the latest search results (query
  // changed, or field cleared back to the initial empty list) — keep it
  // pinned as an item so Combobox can still render it as the selected value.
  const items = useMemo(() => {
    const visible = excludeId ? results.filter((person) => person.id !== excludeId) : results;
    if (!localValue || visible.some((person) => person.id === localValue.id)) return visible;
    return [
      ...visible,
      {
        id: localValue.id,
        slug: "",
        firstName: localValue.name,
        lastName: null,
        maidenName: null,
        nickname: null,
        isPlaceholder: false,
        birthDate: null,
        deathDate: null,
        similarity: 0,
      } satisfies PersonSearchResult,
    ];
  }, [results, localValue, excludeId]);

  function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();

    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;

    startTransition(async () => {
      // Blank query intentionally still hits the server — it returns the
      // whole family, so the list is populated as soon as the field is
      // focused, before the user has typed anything (browse, then narrow).
      const found = await searchPeopleForTraceAction(familyId, trimmed);
      if (controller.signal.aborted) return;
      setResults(found);
    });
  }

  // Populate the full family list the moment the combobox mounts (panel
  // opens), so opening the popup shows everyone rather than an empty list
  // that only fills in once the user starts typing.
  useEffect(() => {
    runSearch("");
    return () => abortControllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  return (
    <Combobox.Root<PersonSearchResult>
      items={items}
      filter={null}
      // Deliberately NOT just `localValue` — base-ui re-fills the input with
      // itemToStringLabel(value) any time the *selected value it's given*
      // changes (its internal setSelectedValue -> shouldFillInput path).
      // While the user is actively editing (query has diverged from the
      // selected person's name, e.g. one character into a backspace), the
      // value passed here must already read as "nothing selected" — otherwise
      // localValue only turns null on the *next* selection/clear (see
      // onValueChange/Combobox.Clear below), and in the gap base-ui's own
      // resync fires a second time and wipes the whole field back to empty
      // instead of leaving the one-character-shorter edit in place.
      value={localValue && query === localValue.name ? (items.find((person) => person.id === localValue.id) ?? null) : null}
      // Controlled explicitly (rather than left to base-ui's own inputValue
      // state) so the displayed text is driven only by `query`, never by
      // base-ui's own selected-value resync.
      inputValue={query}
      itemToStringLabel={(person) => personDisplayName(person)}
      onValueChange={(person) => {
        const next = person ? { id: person.id, name: personDisplayName(person) } : null;
        setLocalValue(next);
        onChange(next);
        setQuery(next ? next.name : "");
        // Picking an item fires onValueChange but NOT onInputValueChange (see
        // the "item-press" guard below) — without this, `results` stays
        // whatever the last real search returned (often the full family list
        // from the initial blank-query fetch), so the popup would keep
        // showing everyone underneath the now-filled input instead of just
        // the person that was picked.
        setResults(person ? [person] : []);
      }}
      onInputValueChange={(nextValue, { reason }) => {
        if (reason === "item-press") return;
        // Only `query` (the displayed text) changes here — localValue/onChange
        // are deliberately left alone on every keystroke; the `value` prop
        // above already stops reporting a selection once query diverges, and
        // eagerly nulling localValue here is what caused base-ui's resync
        // effect to wipe the field (see that prop's comment).
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
            aria-label={`Сбросить ${label.toLowerCase()}`}
          >
            <XIcon className="size-4" />
          </Combobox.Clear>
        </Combobox.InputGroup>
      </div>

      <Combobox.Portal>
        <Combobox.Positioner className="isolate z-50 outline-none" sideOffset={4}>
          <Combobox.Popup
            className={cn(
              "w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            )}
            aria-busy={isPending || undefined}
          >
            <div className="max-h-72 overflow-y-auto overscroll-contain p-1 scroll-pt-1 scroll-pb-1">
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
                    className="flex cursor-default flex-col items-start gap-0.5 rounded-md px-2 py-2 text-left text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    <span className="font-medium">
                      {personDisplayName(person)}
                      {person.maidenName && person.maidenName !== person.lastName && (
                        // Search matches on maidenName too (see searchPersonsByNameSubstring) —
                        // without this, a hit found only via the maiden name looks like an
                        // unexplained/wrong result since personDisplayName never shows it.
                        <span className="font-normal text-muted-foreground"> ({person.maidenName})</span>
                      )}
                    </span>
                    {(person.birthDate || person.deathDate) && (
                      <span className="text-xs text-muted-foreground">
                        {formatPartialDate(person.birthDate)}
                        {person.deathDate && ` — ${formatPartialDate(person.deathDate)}`}
                      </span>
                    )}
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
