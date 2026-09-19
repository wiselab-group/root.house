import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Styled checkbox built on @base-ui/react/checkbox (renders a real hidden
 * <input> alongside its <span>, so `name`/`defaultChecked` submit through
 * plain FormData same as before) — replaces the raw `<input type="checkbox"
 * className="size-4">` previously duplicated across person-date-fields,
 * add-event-form, and add-relative-form with zero project styling. Checked
 * state uses --primary (terracotta) per CLAUDE.md's "terracotta = the one
 * action color" rule — ticking a box is a user choice/action, same category
 * as a button press.
 */
export function Checkbox({
  className,
  ...props
}: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-border bg-background outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[checked]:border-primary data-[checked]:bg-primary data-[checked]:text-primary-foreground data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <CheckIcon className="size-3" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
