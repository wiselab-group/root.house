"use client";

import { createContext, useContext, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Lets a form rendered inside CollapsibleForm collapse itself back to the
 * trigger button (e.g. a Cancel button) without CollapsibleForm's caller
 * having to wire that up by hand. A no-op default so a form using this
 * hook still renders fine outside a CollapsibleForm (nothing to collapse
 * back to, so Cancel would have nothing to do — callers render their own
 * Cancel button conditionally on this hook's presence via a plain check
 * isn't needed since the no-op is harmless either way).
 */
const CollapsibleFormContext = createContext<() => void>(() => {});

/** Reads the close handler for the CollapsibleForm this component is rendered inside, if any. */
export function useCollapsibleFormClose() {
  return useContext(CollapsibleFormContext);
}

/**
 * Wraps an inline "add X" form so it starts collapsed behind a trigger
 * button instead of always being rendered open — the form (with all its
 * fields) shouldn't dominate the page before the user has expressed intent
 * to add something. children stays a plain ReactNode (so this can still be
 * used from a Server Component, unlike a render-prop) — the close handle is
 * threaded down via context instead, and read with useCollapsibleFormClose
 * by the form's own Cancel button. Without this, opening the form was a
 * one-way door (Notion/Google Photos-style "+ Add" always lets you back out
 * before submitting).
 */
export function CollapsibleForm({
  triggerLabel,
  children,
}: {
  triggerLabel: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={false}
        onClick={() => setOpen(true)}
      >
        + {triggerLabel}
      </Button>
    );
  }

  return (
    <CollapsibleFormContext.Provider value={() => setOpen(false)}>
      {children}
    </CollapsibleFormContext.Provider>
  );
}
