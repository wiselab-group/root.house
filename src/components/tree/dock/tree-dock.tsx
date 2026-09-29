"use client";

import { useTranslations } from "next-intl";
import { useReactFlow } from "@xyflow/react";
import { FilterIcon, ScanIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { DockItem } from "./dock-item";
import { DockTooltip, useDockHint } from "./dock-tooltip";
import {
  KinshipDockItem,
  KinshipShelf,
  type DockKinship,
} from "./kinship-dock-item";
import { DOCK_SHORTCUT_LABELS, useDockShortcuts } from "./use-dock-shortcuts";

/**
 * The tree's one control surface, bottom-center over the canvas: a frosted
 * capsule with Filter, fit-to-family and "Родство" (2026-09-27,
 * replacing the "Инструменты" popover + separate "Родство" pill, after the
 * user picked a Vercel-toolbar-style dock — skiper43). The drag-lock toggle
 * was dropped the same day, also per user request: cards are never
 * draggable (tree-canvas.tsx).
 *
 * - Desktop (fine pointer): round icons, one shared tooltip that glides
 *   between them with the item's name and key (F, 0, R — see
 *   useDockShortcuts). "Родство" keeps its label and turns into the answer.
 * - Touch: a tab bar — icon over a short label in each cell, since there's
 *   no hover for a tooltip; the comparison's answer sits on a shelf above.
 *
 * The glass is dark-tinted (bg-background/60 + blur), not the lighter
 * --glass tint: over a light studio photo the old 5%-white pills let the
 * photo show straight through the label (user screenshot, a baby portrait
 * under "Родство") — the same lesson as hero/glass.ts's glassOverPhoto.
 * A soft fade at the canvas's bottom edge lets cards sink under the dock
 * instead of being cut by it.
 *
 * Rendered inside <ReactFlow> (it needs useReactFlow for fit-to-view).
 */
export function TreeDock({
  onOpenFilter,
  isFilterActive,
  kinship,
}: {
  /** Omit (Share Link view) to drop the filter. */
  onOpenFilter?: () => void;
  isFilterActive?: boolean;
  /** Omit (Share Link view) to drop "Родство". */
  kinship?: DockKinship;
}) {
  const t = useTranslations("tree");
  const { fitView } = useReactFlow();
  const reducedMotion = useReducedMotion();
  const { hint, show, hide } = useDockHint();

  const fit = () => void fitView({ duration: reducedMotion ? undefined : 300 });

  useDockShortcuts({
    filter: onOpenFilter,
    fit,
    kinship: kinship?.onToggle,
  });

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-28 bg-linear-to-t from-tree-canvas/85 to-transparent"
      />
      <div
        data-bottom-bar
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pointer-fine:pb-4"
      >
        <div className="pointer-events-auto flex w-full max-w-sm flex-col gap-2 md:pointer-fine:w-auto md:pointer-fine:max-w-none">
          {kinship && <KinshipShelf kinship={kinship} />}
          <div
            role="toolbar"
            aria-label={t("tools")}
            onPointerLeave={hide}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) hide();
            }}
            className={cn(
              "relative grid auto-cols-fr grid-flow-col rounded-3xl border border-glass-edge bg-background/60 p-1.5 shadow-xl shadow-black/40 backdrop-blur-xl backdrop-saturate-150",
              "md:pointer-fine:flex md:pointer-fine:items-center md:pointer-fine:gap-0.5 md:pointer-fine:rounded-full md:pointer-fine:p-1",
            )}
          >
            {onOpenFilter && (
              <DockItem
                icon={<FilterIcon />}
                label={t("filter")}
                shortLabel={t("filter")}
                shortcut={DOCK_SHORTCUT_LABELS.filter}
                onClick={onOpenFilter}
                pressed={isFilterActive}
                badge={isFilterActive}
                onHint={show}
              />
            )}
            <DockItem
              icon={<ScanIcon />}
              label={t("showAll")}
              shortLabel={t("showAllShort")}
              shortcut={DOCK_SHORTCUT_LABELS.fit}
              onClick={fit}
              onHint={show}
            />
            {kinship && <KinshipDockItem kinship={kinship} onHint={show} />}
            <DockTooltip hint={hint} />
          </div>
        </div>
      </div>
    </>
  );
}
