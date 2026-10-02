import { FilterIcon, RouteIcon, ScanIcon, XIcon } from "lucide-react";

/**
 * The tree's tool dock at desktop size (tree-dock.tsx, dock-item.tsx,
 * kinship-dock-item.tsx) while a trace is shown: filter, fit, and the
 * «Родство» tool lit in terracotta, carrying the answer and a ✕ to reset.
 */
export function KinshipDock({ headline }: { headline: string }) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-glass-edge bg-background/60 p-1 shadow-xl shadow-black/40 backdrop-blur-xl backdrop-saturate-150">
      <span className="flex size-10 items-center justify-center rounded-full [&_svg]:size-[1.125rem]">
        <FilterIcon />
      </span>
      <span className="flex size-10 items-center justify-center rounded-full [&_svg]:size-[1.125rem]">
        <ScanIcon />
      </span>
      <span className="mx-1 h-5 w-px bg-glass-edge" />
      <span className="flex h-10 items-center gap-2 rounded-full bg-primary/15 pr-4 pl-3 text-sm font-medium text-primary">
        <RouteIcon className="size-[1.125rem] shrink-0" />
        {headline}
      </span>
      <span className="ml-0.5 flex size-8 items-center justify-center rounded-full text-muted-foreground">
        <XIcon className="size-4" />
      </span>
    </div>
  );
}
