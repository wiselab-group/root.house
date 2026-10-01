import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  type LucideIcon,
} from "lucide-react";

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
  /** Makes the item a link to where it's counted («47 человек» → Люди). */
  href?: string;
}

/** The quiet icon + text line under a hero title (dates, place, reading time). */
export function HeroMeta({ items }: { items: HeroMetaItem[] }) {
  if (items.length === 0) return null;
  // A linked row needs a wider gap: the ↗ lives in it (see MetaLink) and
  // at gap-x-5 sat ~4px from the next item (user report 2026-10-01).
  const linked = items.some((item) => item.href);
  return (
    <ul
      className={`flex flex-wrap gap-y-1.5 text-sm text-foreground/65 ${linked ? "gap-x-8" : "gap-x-5"}`}
    >
      {items.map(({ then, href, ...part }) => (
        <li key={part.label} className="flex items-center gap-2">
          {href ? <MetaLink href={href} part={part} /> : <MetaPart {...part} />}
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

/** A linked item: brightens on hover, and a ↗ fades in beside it — placed
 *  absolutely in the row's gap (gap-x-8: 4px to the arrow, 14px arrow,
 *  14px to the next item), so the hidden arrow never widens the item and
 *  pushes its neighbours apart. */
function MetaLink({ href, part }: { href: string; part: HeroMetaPart }) {
  return (
    <Link
      href={href}
      className="group/meta relative flex items-center rounded-sm transition-colors duration-fast ease-(--ease-reveal) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <MetaPart {...part} />
      <ArrowUpRightIcon
        className="pointer-events-none absolute -right-4.5 size-3.5 -translate-x-0.5 translate-y-0.5 opacity-0 transition-[opacity,transform] duration-fast ease-(--ease-reveal) group-hover/meta:translate-0 group-hover/meta:opacity-80 group-focus-visible/meta:translate-0 group-focus-visible/meta:opacity-80 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </Link>
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
