import { cn } from "@/lib/utils";

/**
 * What a person tag looks like on a photo — a small translucent white
 * point, no outline (user request), just a faint soft shadow so it still
 * separates from a bright studio wall. Replaced a flat orange dot (user:
 * "чтобы смотрелось дорого"); a ring and a name caption were tried next
 * and dropped at the user's word — the name is already in the strip under
 * the photo.
 *
 * Pure visual: PhotoTagLayer's marker button (hit area, drag, menu) and the
 * tagging-mode cursor both render this.
 */
export function TagReticle({ shown }: { shown: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-2 rounded-full bg-white/75 shadow-[0_0_6px_color-mix(in_oklch,black_35%,transparent)] transition-[transform,opacity] duration-300 ease-(--ease-reveal)",
        shown
          ? "scale-100 opacity-100 group-hover:scale-150 group-focus-visible:scale-150"
          : "scale-50 opacity-0",
      )}
    />
  );
}
