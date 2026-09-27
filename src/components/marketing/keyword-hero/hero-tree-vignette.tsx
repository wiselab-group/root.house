import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { MiniPersonCard } from "@/components/marketing/shared/mini-person-card";
import {
  HARTLEY_FAMILY,
  type DemoPersonId,
} from "@/components/marketing/shared/hartley-family";
import { HERO_KEYWORDS } from "./hero-keywords.data";

/** Card top-center positions, % of the square box. Card width 22% → its
 *  frame is 16.7% wide, so a frame's center sits 8.4% below its top. */
const SLOTS: readonly { id: DemoPersonId; x: number; y: number }[] = [
  { id: "ivan", x: 30, y: 0 },
  { id: "vera", x: 70, y: 0 },
  { id: "margaret", x: 30, y: 40 },
  { id: "david", x: 70, y: 40 },
  { id: "owen", x: 50, y: 78 },
];

/** Partnership lines at frame-center height, union trunks down to the
 *  child's frame top — the tree's own genogram shapes. */
const CONNECTORS = [
  "M38.4 8.4H61.6",
  "M50 8.4V30H30V40",
  "M38.4 48.4H61.6",
  "M50 48.4V78",
];

/**
 * The hero's small family: whichever keyword is in focus lights the people
 * that memory belongs to (terracotta frame — the tree's own "what you're
 * looking at" state), with the memory itself as a chip beside them. The last
 * keyword ("your family") lights no one and brings everyone to full strength.
 */
export function HeroTreeVignette({
  activeIndex,
  className,
  style,
}: {
  activeIndex: number;
  className?: string;
  style?: CSSProperties;
}) {
  const keyword = HERO_KEYWORDS[activeIndex];
  const isWholeFamily = keyword.highlight.length === 0;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "@container relative mx-auto aspect-square w-full max-w-72 sm:max-w-md lg:max-w-lg",
        className,
      )}
      style={style}
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 size-full overflow-visible"
      >
        {CONNECTORS.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="var(--branch)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {SLOTS.map(({ id, x, y }) => {
        const isLit = keyword.highlight.includes(id);
        return (
          <div
            key={id}
            className={cn(
              "absolute w-[22%] -translate-x-1/2 transition-opacity duration-slow ease-(--ease-reveal)",
              isWholeFamily || isLit ? "opacity-100" : "opacity-45",
            )}
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            {/* First names only — the vignette is small, and a wrapped
                "Ivan / Hartley" collides with the memory chips. */}
            <MiniPersonCard
              name={HARTLEY_FAMILY[id].name.split(" ")[0]}
              years={HARTLEY_FAMILY[id].years}
              active={isLit}
            />
          </div>
        );
      })}
      {HERO_KEYWORDS.map((item, index) => (
        <span
          key={item.text}
          className={cn(
            "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-glass-edge bg-glass-strong px-3 py-1 text-xs whitespace-nowrap text-foreground backdrop-blur-md transition-[opacity,transform] duration-slow ease-(--ease-reveal)",
            index === activeIndex
              ? "opacity-100"
              : "translate-y-[calc(-50%+6px)] opacity-0",
          )}
          style={{ left: `${item.noteAt.x}%`, top: `${item.noteAt.y}%` }}
        >
          {item.note}
        </span>
      ))}
    </div>
  );
}
