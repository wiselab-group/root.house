"use client";

import { useCallback, useState } from "react";

/**
 * use-collapsed-branches.ts — collapse/expand (rewrite plan §7 Stage 5).
 *
 * Purely ephemeral client React state — a `Set<string>` of collapsed
 * branch keys, never persisted to the database or the URL. Every fresh
 * visit to the tree re-opens fully expanded, matching the plan's own
 * explicit decision (§ "Зафиксированные решения"): "Каждое открытие дерева
 * — всё развёрнуто по умолчанию."
 *
 * A key is either `person:<personId>` (PersonNode's own per-card badge —
 * hides every child of that person, across all partnerships) or
 * `union:<partnershipEdgeId>` (the badge rendered on a partnership line's
 * own midpoint when the couple shares a child — hides only THAT couple's
 * shared children). See prune-collapsed.ts's own doc comment for the full
 * rationale; this hook itself is agnostic to which shape a given key has.
 */
export interface UseCollapsedBranchesResult {
  collapsedIds: ReadonlySet<string>;
  isCollapsed: (collapseKey: string) => boolean;
  toggleCollapse: (collapseKey: string) => void;
}

export function useCollapsedBranches(): UseCollapsedBranchesResult {
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const toggleCollapse = useCallback((collapseKey: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(collapseKey)) next.delete(collapseKey);
      else next.add(collapseKey);
      return next;
    });
  }, []);

  const isCollapsed = useCallback(
    (collapseKey: string) => collapsedIds.has(collapseKey),
    [collapsedIds],
  );

  return { collapsedIds, isCollapsed, toggleCollapse };
}
