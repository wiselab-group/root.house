"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MentionNodeAttrs } from "@tiptap/extension-mention";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import type { PersonRecord } from "@/domain/person/person.repository";

/** A family member «@» can name — the whole family is handed to the editor
 *  by the page (families stay within the card limit), so the list filters
 *  as you type with no round trip. */
export interface MentionPerson {
  id: string;
  name: string;
  /** Name forms search matches on (maiden name, nickname), lower-cased. */
  search: string;
  years: string | null;
  thumb: Pick<
    PersonRecord,
    "firstName" | "lastName" | "nickname" | "isPlaceholder" | "photoMediaId"
  >;
}

export interface MentionState {
  items: MentionPerson[];
  index: number;
  /** The caret's box, measured on demand — the page may scroll while the
   *  list is open. */
  getRect: () => DOMRect | null;
  select: (person: MentionPerson) => void;
}

const MAX_ITEMS = 8;

function filterPeople(people: MentionPerson[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return people.slice(0, MAX_ITEMS);
  const hits = people.filter((person) => person.search.includes(q));
  // Names that start with what was typed first.
  hits.sort(
    (a, b) => Number(!a.search.startsWith(q)) - Number(!b.search.startsWith(q)),
  );
  return hits.slice(0, MAX_ITEMS);
}

/**
 * Tiptap's «@» suggestion wired to React state: the suggestion plugin is
 * configured once (useEditor's extensions don't change), so it talks to
 * the component through refs — `state` drives MentionPopup, keys go to
 * `handleKey`. Arrow keys move, Enter/Tab pick, Escape closes (Tiptap).
 */
export function useMentionSuggestion(people: MentionPerson[]) {
  const [state, setState] = useState<MentionState | null>(null);
  const peopleRef = useRef(people);
  const stateRef = useRef(state);

  useEffect(() => {
    peopleRef.current = people;
  }, [people]);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const suggestion = useMemo((): Omit<
    SuggestionOptions<MentionPerson, MentionNodeAttrs>,
    "editor"
  > => {
    const toState = (
      props: SuggestionProps<MentionPerson, MentionNodeAttrs>,
      index: number,
    ): MentionState => ({
      items: props.items,
      index: Math.min(index, Math.max(props.items.length - 1, 0)),
      getRect: () => props.clientRect?.() ?? null,
      select: (person) => props.command({ id: person.id, label: person.name }),
    });
    return {
      char: "@",
      allowSpaces: true,
      items: ({ query }) => filterPeople(peopleRef.current, query),
      render: () => ({
        onStart: (props) => setState(toState(props, 0)),
        onUpdate: (props) => setState(toState(props, 0)),
        onExit: () => setState(null),
        onKeyDown: ({ event }) => {
          const current = stateRef.current;
          if (!current || current.items.length === 0) return false;
          const count = current.items.length;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            const step = event.key === "ArrowDown" ? 1 : -1;
            setState({
              ...current,
              index: (current.index + step + count) % count,
            });
            return true;
          }
          if (event.key === "Enter" || event.key === "Tab") {
            current.select(current.items[current.index]);
            return true;
          }
          return false;
        },
      }),
    };
  }, []);

  return {
    suggestion,
    state,
    setIndex: (index: number) =>
      setState((current) => (current ? { ...current, index } : current)),
  };
}
