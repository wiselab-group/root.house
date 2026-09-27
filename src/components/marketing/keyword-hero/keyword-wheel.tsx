import { cn } from "@/lib/utils";
import { keywordOpacity } from "@/components/marketing/shared/scroll-math";
import { HERO_KEYWORDS } from "./hero-keywords.data";

/** Line height of text-hero — one keyword step, in em. */
const STEP_EM = 1.08;

/**
 * The rolling end of the hero heading: keywords stacked one line apart and
 * slid by the scroll position, so the one in focus sits on the heading's
 * last line and the next one waits faintly below it. Visual only — the
 * heading's accessible text ends with a fixed "your family".
 */
export function KeywordWheel({ position }: { position: number }) {
  const lastIndex = HERO_KEYWORDS.length - 1;
  return (
    <>
      <span aria-hidden="true" className="relative block h-[2.16em]">
        {HERO_KEYWORDS.map((keyword, index) => {
          const distance = index - position;
          return (
            <span
              key={keyword.text}
              className={cn(
                "absolute inset-x-0 top-0 block whitespace-nowrap transition-[transform,opacity] duration-instant ease-(--ease-reveal) will-change-transform",
                index === lastIndex && "text-primary italic",
              )}
              style={{
                transform: `translateY(${distance * STEP_EM}em)`,
                opacity: keywordOpacity(distance),
              }}
            >
              {keyword.text}
              {index === lastIndex && "."}
            </span>
          );
        })}
      </span>
      <span className="sr-only">your family.</span>
    </>
  );
}
