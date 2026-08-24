"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Wraps an inline "add X" form so it starts collapsed behind a trigger
 * button instead of always being rendered open — the form (with all its
 * fields) shouldn't dominate the page before the user has expressed intent
 * to add something. Purely a display toggle: the form itself keeps owning
 * its state, action, and submission.
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

  return <>{children}</>;
}
