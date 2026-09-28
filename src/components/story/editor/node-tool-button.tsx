"use client";

import { cn } from "@/lib/utils";

/** A round frosted tool over a photo or letter in the story editor
 *  (StoryPhotoView, StoryLetterView) — icon only, its label as aria-label
 *  and tooltip. `pressed` for a toggle. */
export function NodeToolButton({
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
      onClick={onClick}
      className={cn(
        "grid size-9 place-items-center rounded-full bg-background/80 text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur-md transition-[background-color,color,scale] duration-base ease-(--ease-reveal) outline-none hover:bg-background active:scale-95 focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4",
        pressed && "bg-foreground text-background hover:bg-foreground/90",
      )}
    >
      {children}
    </button>
  );
}
