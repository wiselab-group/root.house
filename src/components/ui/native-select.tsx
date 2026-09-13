import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Plain native <select> styled to match Input exactly (same height, radius,
 * padding, border and focus states) — every dropdown in the app (event
 * type, gender, place, privacy level, share-link options, family role, …)
 * renders through this instead of a raw <select> with its own copy of the
 * class string, so Input and <select> heights can never drift apart again.
 */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-3.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
