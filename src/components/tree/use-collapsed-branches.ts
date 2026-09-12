"use client";

import { useCallback, useState } from "react";

/**
 * use-collapsed-branches.ts — collapse/expand (rewrite plan §7 Stage 5).
 *
 * Purely ephemeral client React state — a `Set<string>` of collapsed root
 * person ids, never persisted to the database or the URL. Every fresh visit
 * to the tree re-opens fully expanded, matching the plan's own explicit
 * decision (§ "Зафиксированные решения"): "Каждое открытие дерева — всё
 * развёрнуто по умолчанию."
 */
export interface UseCollapsedBranchesResult {
  collapsedIds: ReadonlySet<string>;
  isCollapsed: (personId: string) => boolean;
  toggleCollapse: (personId: string) => void;
}

export function useCollapsedBranches(): UseCollapsedBranchesResult {
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const toggleCollapse = useCallback((personId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  }, []);

  const isCollapsed = useCallback(
    (personId: string) => collapsedIds.has(personId),
    [collapsedIds],
  );

  return { collapsedIds, isCollapsed, toggleCollapse };
}
