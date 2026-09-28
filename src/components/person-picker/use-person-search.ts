"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { searchPeopleForTraceAction } from "@/actions/tree.actions";
import type { PersonSearchResult } from "@/domain/search/search.service";

/**
 * The search behind every person picker: browse everyone, then narrow as
 * you type. The whole family is fetched on mount (a blank query returns
 * everyone), so the list is there the moment the field is focused. Each
 * new query aborts the previous one, so a slow early response can't
 * overwrite a later one.
 */
export function usePersonSearch(familyId: string) {
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const abortControllerRef = useRef<AbortController | null>(null);

  function search(query: string) {
    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;

    startTransition(async () => {
      const found = await searchPeopleForTraceAction(familyId, query.trim());
      if (controller.signal.aborted) return;
      setResults(found);
    });
  }

  useEffect(() => {
    search("");
    return () => abortControllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  return { results, setResults, isPending, search };
}

/**
 * A selected person who fell out of the latest results (the query moved
 * on), rebuilt from the { id, name } the caller holds — Combobox needs an
 * item to render a selected value from.
 */
export function pinnedPerson(id: string, name: string): PersonSearchResult {
  return {
    id,
    slug: "",
    firstName: name,
    lastName: null,
    maidenName: null,
    nickname: null,
    isPlaceholder: false,
    photoMediaId: null,
    birthDate: null,
    deathDate: null,
    similarity: 0,
  };
}
