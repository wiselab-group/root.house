"use client";

import { useEffect, useRef, useState } from "react";
import { geocodePlace, type GeocodeResult } from "@/lib/maptiler-geocode";

/** Wait for a pause in typing before hitting MapTiler — one request per word, not per key. */
const SEARCH_DEBOUNCE_MS = 250;

/**
 * MapTiler place search for PlaceField: debounced, and any in-flight
 * request is aborted by the next one, so a slow early response can never
 * overwrite a later one's results.
 */
export function useGeocodeSearch() {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  function cancel() {
    if (timerRef.current) clearTimeout(timerRef.current);
    controllerRef.current?.abort();
  }

  function search(query: string) {
    cancel();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    timerRef.current = setTimeout(() => {
      const controller = new AbortController();
      controllerRef.current = controller;
      void geocodePlace(trimmed, controller.signal)
        .catch(() => [])
        .then((found) => {
          if (controller.signal.aborted) return;
          setResults(found);
          setIsSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);
  }

  useEffect(() => cancel, []);

  return { results, isSearching, search };
}
