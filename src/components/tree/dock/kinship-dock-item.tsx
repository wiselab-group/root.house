"use client";

import { useTranslations } from "next-intl";
import { RouteIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShowDockHint } from "./dock-tooltip";
import { DockItem } from "./dock-item";

export interface DockKinship {
  /** The current answer ("Троюродные сёстры"), or null with no pair picked. */
  headline: string | null;
  /** "Анна Соколова ↔ Мария Ветрова" — the touch shelf's second line. */
  pair: string | null;
  isPanelOpen: boolean;
  onToggle: () => void;
  onReset: () => void;
  shortcut: string;
}

/**
 * "Родство" in the dock. Desktop: keeps its text label (the one item that
 * does — it's the dock's main action), and once a pair is compared the
 * label is replaced by the answer itself, with a × to clear it. The two
 * texts cross-fade on opacity/transform; the item simply takes the width
 * of whichever is showing, nothing animates width.
 */
export function KinshipDockItem({
  kinship,
  onHint,
}: {
  kinship: DockKinship;
  onHint: ShowDockHint;
}) {
  const t = useTranslations("kinship");
  const { headline, isPanelOpen, shortcut } = kinship;
  const isActive = headline !== null;
  const hintLabel = isActive ? t("openPanel") : t("compare");
  const text =
    "block whitespace-nowrap transition-[opacity,transform] duration-slow ease-(--ease-reveal)";

  return (
    <>
      <DockItem
        className="md:pointer-fine:hidden"
        icon={<RouteIcon />}
        label={hintLabel}
        shortLabel={t("title")}
        pressed={isActive || isPanelOpen}
        onClick={kinship.onToggle}
        onHint={onHint}
      />
      <span
        aria-hidden
        className="mx-1 hidden h-5 w-px bg-glass-edge md:pointer-fine:block"
      />
      <div className="hidden items-center md:pointer-fine:flex">
        <button
          type="button"
          aria-expanded={isPanelOpen}
          aria-keyshortcuts={shortcut}
          onClick={kinship.onToggle}
          onPointerEnter={(e) => onHint(e.currentTarget, hintLabel, shortcut)}
          onFocus={(e) => onHint(e.currentTarget, hintLabel, shortcut)}
          className={cn(
            "flex h-10 cursor-pointer items-center gap-2 rounded-full pr-4 pl-3 text-sm font-medium outline-none",
            "transition-[background-color,color,transform] duration-base ease-(--ease-reveal) hover:bg-foreground/8 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring",
            (isActive || isPanelOpen) &&
              "bg-primary/15 text-primary hover:bg-primary/20",
          )}
        >
          <RouteIcon className="size-[1.125rem] shrink-0 fill-none!" />
          <span className="relative max-w-64">
            <span
              className={cn(
                text,
                isActive && "absolute inset-x-0 top-0 -translate-y-2 opacity-0",
              )}
            >
              {t("title")}
            </span>
            {headline && (
              <span
                className={cn(
                  text,
                  "truncate font-heading text-[0.95rem] animate-in fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none",
                )}
              >
                {headline}
              </span>
            )}
          </span>
        </button>
        {isActive && (
          <button
            type="button"
            aria-label={t("resetCompare")}
            onClick={kinship.onReset}
            onPointerEnter={(e) => onHint(e.currentTarget, t("resetCompare"))}
            onFocus={(e) => onHint(e.currentTarget, t("resetCompare"))}
            className="ml-0.5 flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none transition-colors duration-base ease-(--ease-reveal) hover:bg-foreground/8 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <XIcon className="size-4 fill-none!" />
          </button>
        )}
      </div>
    </>
  );
}

/**
 * Touch only: the comparison's answer as a shelf above the dock, since the
 * tab-bar cell is too narrow to hold it. Tapping it reopens the panel.
 */
export function KinshipShelf({ kinship }: { kinship: DockKinship }) {
  const t = useTranslations("kinship");
  if (!kinship.headline || kinship.isPanelOpen) return null;
  return (
    <div className="flex animate-in items-center gap-2 rounded-2xl border border-primary bg-background/60 py-1.5 pr-1.5 pl-4 shadow-xl shadow-black/40 backdrop-blur-xl backdrop-saturate-150 duration-slow ease-(--ease-reveal) fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none md:pointer-fine:hidden">
      <button
        type="button"
        onClick={kinship.onToggle}
        className="flex min-w-0 flex-1 cursor-pointer flex-col items-start text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="font-heading text-base leading-tight font-medium text-primary">
          {kinship.headline}
        </span>
        {kinship.pair && (
          <span className="w-full truncate text-xs text-muted-foreground">
            {kinship.pair}
          </span>
        )}
      </button>
      <button
        type="button"
        aria-label={t("resetCompare")}
        onClick={kinship.onReset}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground/8 text-foreground outline-none active:scale-[0.94] focus-visible:ring-2 focus-visible:ring-ring"
      >
        <XIcon className="size-4 fill-none!" />
      </button>
    </div>
  );
}
