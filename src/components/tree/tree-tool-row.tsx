import { cn } from "@/lib/utils";
import { PopoverClose } from "@/components/ui/popover";

/**
 * One row inside TreeToolsMenu's popover sheet — icon + label in one 44px-
 * tall tap target. Split out purely to keep tree-tools-menu.tsx under
 * CLAUDE.md's 150-line component limit. Wrapped in PopoverClose (not a
 * plain button) so clicking a row both fires the action AND closes the
 * sheet — same convention this component's own predecessor (tree-card-
 * style-control.tsx's ControlRow, since removed) already used. `pressed`
 * shades the row for whichever rows have an active/toggled state (drag-
 * lock, and Trace/Filter's own "is a trace/filter currently applied"
 * status via the same shared styling, not just a boolean toggle in the
 * strict sense).
 */
export function ToolRow({
  icon,
  label,
  onClick,
  pressed,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <PopoverClose
      render={
        <button
          type="button"
          onClick={onClick}
          aria-pressed={pressed}
          className={cn(
            "flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-foreground hover:bg-muted",
            pressed && "bg-muted",
          )}
        />
      }
    >
      <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4.5 [&_svg]:fill-none">
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-left">{label}</span>
    </PopoverClose>
  );
}
