"use client";

import { cn } from "@/lib/utils";

/** The editor's floating menus (StoryBubbleMenu, StoryInsertMenu): one
 *  small popover-coloured capsule. */
export const menuSurfaceClass =
  "z-50 flex items-center rounded-full bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10";

/** An icon button in a floating editor menu — `pressed` when the
 *  selection already has that style (the mock's segmented control: ink
 *  fill, page-coloured icon). Mousedown is prevented so the editor keeps
 *  its selection. */
export function MenuButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid size-9 place-items-center rounded-full text-foreground/75 transition-[background-color,color,scale] duration-base ease-(--ease-reveal) outline-none hover:bg-accent hover:text-foreground active:scale-95 focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4",
        pressed &&
          "bg-foreground text-background hover:bg-foreground/90 hover:text-background",
      )}
    >
      {children}
    </button>
  );
}

export function MenuDivider() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />;
}
