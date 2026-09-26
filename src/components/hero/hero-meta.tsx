import { ArrowRightIcon, type LucideIcon } from "lucide-react";

interface HeroMetaPart {
  Icon: LucideIcon;
  label: string;
  /** What the icon means («Живёт сейчас») — a tooltip and a screen-reader
   *  prefix, for when the icon alone carries meaning the label doesn't. */
  hint?: string;
}

export interface HeroMetaItem extends HeroMetaPart {
  /** Where this item leads — rendered in the same group after an arrow
   *  («📍 Минск → 🏠 Таллинн»), not as a separate, gap-spaced item. */
  then?: HeroMetaPart;
}

/** The quiet icon + text line under a hero title (dates, place, reading time). */
export function HeroMeta({ items }: { items: HeroMetaItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-foreground/65">
      {items.map(({ then, ...part }) => (
        <li key={part.label} className="flex items-center gap-2">
          <MetaPart {...part} />
          {then && (
            <>
              <ArrowRightIcon
                className="size-3.5 shrink-0 text-foreground/40"
                aria-hidden="true"
              />
              <span className="sr-only">, </span>
              <MetaPart {...then} />
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function MetaPart({ Icon, label, hint }: HeroMetaPart) {
  return (
    <span title={hint} className="flex items-center gap-1.5 tabular-nums">
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {hint && <span className="sr-only">{hint}: </span>}
      {label}
    </span>
  );
}
