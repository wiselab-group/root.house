"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { personDisplayName } from "@/domain/person/display-name";
import { formatPartialDate } from "@/domain/shared/partial-date";
import { searchPeopleForTraceAction } from "@/actions/tree.actions";
import type { PersonSearchResult } from "@/domain/search/search.service";

/**
 * Reusable "pick a Person" search dialog — used by TreeToolbar for both
 * Relationship Trace's "select Person A/B" (plan §17) and, potentially, any
 * future flow needing the same picker. Pure UI + a debounce-free search
 * action call; it has no idea what the selection is *for* — the caller's
 * onSelect decides (set ?traceA=, set ?traceB=, ...).
 */
export function PersonPickerDialog({
  open,
  onOpenChange,
  familyId,
  title,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: string;
  title: string;
  onSelect: (personId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleQueryChange(value: string) {
    setQuery(value);
    startTransition(async () => {
      const found = await searchPeopleForTraceAction(familyId, value);
      setResults(found);
    });
  }

  function handleSelect(personId: string) {
    onSelect(personId);
    onOpenChange(false);
    setQuery("");
    setResults([]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Введите имя, фамилию или год рождения.</DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          type="search"
          placeholder="Иванов, Анна, 1924…"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
        />
        <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {isPending && <li className="px-1 py-2 text-sm text-muted-foreground">Ищем…</li>}
          {!isPending && query.trim().length > 0 && results.length === 0 && (
            <li className="px-1 py-2 text-sm text-muted-foreground">Ничего не найдено.</li>
          )}
          {!isPending &&
            results.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(person.id)}
                  className="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                >
                  <span className="text-sm font-medium">{personDisplayName(person)}</span>
                  {(person.birthDate || person.deathDate) && (
                    <span className="text-xs text-muted-foreground">
                      {formatPartialDate(person.birthDate)}
                      {person.deathDate && ` — ${formatPartialDate(person.deathDate)}`}
                    </span>
                  )}
                </button>
              </li>
            ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
