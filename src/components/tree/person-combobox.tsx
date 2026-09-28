"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { cn } from "@/lib/utils";
import { personDisplayName } from "@/domain/person/display-name";
import { PersonPickerInput } from "@/components/person-picker/person-picker-input";
import { PersonPickerPopup } from "@/components/person-picker/person-picker-popup";
import {
  pinnedPerson,
  usePersonSearch,
} from "@/components/person-picker/use-person-search";
import type { PersonSearchResult } from "@/domain/search/search.service";

/**
 * Inline search-as-you-type picker for a single Person — the shared
 * person-picker field and rows (components/person-picker) — input and results
 * list are the same control (no separate picker dialog hop), so picking
 * Person A/B for Relationship Trace stays inside KinshipPanel. Selection
 * is a controlled { id, name } pair so the caller (useKinshipTrace) still
 * owns the URL param as the source of truth.
 *
 * `excludeId` drops one person (typically whoever is already selected in
 * the other slot) from the results — comparing A to itself isn't a
 * meaningful trace, so Person B's list must not offer whoever is Person A.
 *
 * `value` is owned by the caller (the URL param), but writing it goes
 * through the URL and lands one render tick later — so mirroring `value` straight into Combobox.Root's `value` would make
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
  const t = useTranslations("tree");
  const locale = useLocale();
  const inputId = useId();
  const [query, setQuery] = useState(value?.name ?? "");
  const [localValue, setLocalValue] = useState(value);
  const { results, setResults, isPending, search } = usePersonSearch(familyId);

  // Resync from the prop the moment it moves (URL navigation completed, or
  // a change from outside, e.g. the other slot's excludeId) — adjusted
  // during render rather than in an effect, which would cost a commit.
  // localValue and the displayed text (`query`) both reset to it.
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
    const visible = excludeId
      ? results.filter((person) => person.id !== excludeId)
      : results;
    if (!localValue || visible.some((person) => person.id === localValue.id))
      return visible;
    return [...visible, pinnedPerson(localValue.id, localValue.name)];
  }, [results, localValue, excludeId]);

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
      value={
        localValue && query === localValue.name
          ? (items.find((person) => person.id === localValue.id) ?? null)
          : null
      }
      // Controlled explicitly (rather than left to base-ui's own inputValue
      // state) so the displayed text is driven only by `query`, never by
      // base-ui's own selected-value resync.
      inputValue={query}
      itemToStringLabel={(person) => personDisplayName(person, locale)}
      onValueChange={(person) => {
        const next = person
          ? { id: person.id, name: personDisplayName(person, locale) }
          : null;
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
        search(nextValue);
      }}
    >
      <div className={cn("flex flex-col gap-1.5", className)}>
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
        <PersonPickerInput
          id={inputId}
          placeholder={t("searchPlaceholder")}
          clearLabel={t("resetField", { label: label.toLowerCase() })}
        />
      </div>

      <PersonPickerPopup
        familyId={familyId}
        isPending={isPending}
        query={query}
      />
    </Combobox.Root>
  );
}
