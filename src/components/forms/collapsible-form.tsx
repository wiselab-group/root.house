"use client";

import { createContext, useContext, useState } from "react";
import { PlusIcon } from "lucide-react";
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
  renderTrigger,
  triggerAppearance = "outline",
  children,
}: {
  triggerLabel: string;
  /** Replaces the default outline "+ label" button — e.g. the Person
   *  Profile's full-width «Добавить родственника» tile. Receives the open
   *  handler; must render a real button (aria-expanded is on the caller). */
  renderTrigger?: (open: () => void) => React.ReactNode;
  /** "primary" — a terracotta pill (the page's main add-action, e.g. the
   *  Person Profile's «Добавить историю»). A plain string rather than a
   *  renderTrigger so Server Components can pick it too. */
  triggerAppearance?: "outline" | "primary";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    if (renderTrigger) return renderTrigger(() => setOpen(true));
    if (triggerAppearance === "primary") {
      return (
        <button
          type="button"
          aria-expanded={false}
          onClick={() => setOpen(true)}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-[background-color,transform] duration-200 ease-(--ease-reveal) hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.97]"
        >
          <PlusIcon className="size-4" aria-hidden="true" />
          {triggerLabel}
        </button>
      );
    }
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
