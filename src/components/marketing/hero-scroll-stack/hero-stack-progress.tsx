import { cn } from "@/lib/utils";
import type { HeroSlide } from "./hero-slides.data";

/** Reflects scroll progress through the stack — not a click-to-navigate
 *  control (there's no separate "slide" to jump to, only scroll position),
 *  but still gives a visible sense of place plus a screen-reader status. */
export function HeroStackProgress({
  slides,
  activeIndex,
}: {
  slides: readonly HeroSlide[];
  activeIndex: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2" aria-hidden="true">
        {slides.map((slide, index) => (
          <span
            key={slide.id}
            className={cn(
              "size-2.5 rounded-full transition-colors duration-200",
              index === activeIndex ? "bg-primary" : "bg-muted-foreground/30",
            )}
          />
        ))}
      </div>
      <span className="sr-only" role="status">
        Showing {activeIndex + 1} of {slides.length}:{" "}
        {slides[activeIndex]?.eyebrow}
      </span>
      <span className="text-xs text-muted-foreground">Keep scrolling</span>
    </div>
  );
}
