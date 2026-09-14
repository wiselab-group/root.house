import * as React from "react";

import { cn } from "@/lib/utils";

/** Multi-line sibling of Input — every visual state (focus ring, disabled,
 *  aria-invalid) mirrors Input's own classes exactly, so a form field looks
 *  the same whether it happens to need one line or several. Plain <textarea>
 *  (Base UI has no textarea primitive to wrap, unlike Input), same
 *  data-slot convention as the rest of components/ui for consistent
 *  targeting in tests/devtools. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-16 w-full min-w-0 rounded-lg border border-input bg-transparent px-3.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
