"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
 *
 * Collapsing (not expanding) a branch is deliberately staged in two steps
 * — `pendingCollapseIds` first, `collapsedIds` only after
 * COLLAPSE_ANIMATION_MS — so the branch's own cards/lines stay mounted long
 * enough to play a reverse draw-in sweep (tree-collapsing-edges-context.tsx)
 * before `pruneCollapsedDescendants` actually removes them. Expanding is
 * still instant: the branch needs to be back in the DOM immediately for its
 * own (forward) draw-in animation to have something to animate in the first
 * place, and toggling a key already in `pendingCollapseIds` back off (user
 * clicks collapse then immediately expand again, mid-animation) must cancel
 * the pending removal rather than let a stale timeout collapse it anyway.
 */
export interface UseCollapsedBranchesResult {
  /** The real, committed collapse state — feeds pruneCollapsedDescendants. */
  collapsedIds: ReadonlySet<string>;
  /**
   * Keys currently mid-collapse (badge already toggled, branch still
   * mounted for its reverse animation) — NOT yet in `collapsedIds`. Union
   * this with `collapsedIds` when a caller needs "should this currently
   * read as collapsed" (e.g. the badge's own icon), since the user's click
   * already committed to collapsing even though the removal itself is
   * deferred.
   */
  pendingCollapseIds: ReadonlySet<string>;
  /**
   * The collapse key most recently toggled from collapsed to expanded —
   * cleared back to undefined on the very next toggle. TreeCanvas uses this
   * to recompute that one branch's collapse-animation direction (see
   * prune-collapsed.ts's computeCollapseAnimationDirections) for the
   * expand/entrance sweep, symmetric with the exit sweep it played while
   * collapsed — a branch that retracted toward its attachment point must
   * grow back out from that same point, not always in the DB's plain
   * parent→child order (user-requested, see LayoutEdge.isCollapseAnimationReversed's
   * own doc comment). Not a Set — only one key can ever be "the branch that
   * was just expanded" at a time (the badge that triggers this only exists
   * on a currently-collapsed branch, so double-expanding the same key twice
   * before a re-render is not a real sequence).
   */
  lastExpandedKey: string | undefined;
  isCollapsed: (collapseKey: string) => boolean;
  toggleCollapse: (collapseKey: string) => void;
}

/** Must match globals.css's `.animate-tree-edge-collapse` duration exactly — the branch is actually removed the instant the reverse sweep finishes painting. */
export const COLLAPSE_ANIMATION_MS = 420;

export function useCollapsedBranches(): UseCollapsedBranchesResult {
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [pendingCollapseIds, setPendingCollapseIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [lastExpandedKey, setLastExpandedKey] = useState<string | undefined>(
    undefined,
  );
  const timeoutsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      for (const timeout of timeouts.values()) clearTimeout(timeout);
      timeouts.clear();
    };
  }, []);

  // Deliberately NOT built from updater-function callbacks that also set
  // OTHER state or schedule a timeout from inside themselves (an earlier
  // version did exactly that, nesting setPendingCollapseIds/setTimeout
  // inside setCollapsedIds's own updater) — React (Strict Mode, which
  // Next.js dev enables by default) invokes state updater functions TWICE
  // to surface exactly this kind of impurity, so that version silently
  // scheduled two competing timeouts per collapse click and left collapsed
  // state impossible to reopen (real bug the user hit: could collapse but
  // never expand again). Reading `collapsedIds`/`pendingCollapseIds`
  // directly here (both are already in scope from useState) and branching
  // in plain function body code — not inside an updater — keeps every
  // setState call and setTimeout a plain, single side effect instead.
  const toggleCollapse = useCallback(
    (collapseKey: string) => {
      const pendingTimeout = timeoutsRef.current.get(collapseKey);

      if (pendingTimeout) {
        // Already collapsing (mid reverse-animation) — toggling again means
        // "expand it back", so cancel the deferred removal instead of also
        // scheduling a new collapse on top of it. Not recorded as
        // lastExpandedKey: the branch never actually left the DOM (it was
        // still mid its own exit sweep), so there's no entrance animation
        // to play here at all — it simply stops retracting.
        clearTimeout(pendingTimeout);
        timeoutsRef.current.delete(collapseKey);
        setPendingCollapseIds((prev) => {
          if (!prev.has(collapseKey)) return prev;
          const next = new Set(prev);
          next.delete(collapseKey);
          return next;
        });
        return;
      }

      if (collapsedIds.has(collapseKey)) {
        // Fully collapsed already — expand instantly. Recorded as
        // lastExpandedKey so TreeCanvas can recompute this one branch's
        // entrance-sweep direction (see this hook's own doc comment on
        // lastExpandedKey).
        setCollapsedIds((prev) => {
          const next = new Set(prev);
          next.delete(collapseKey);
          return next;
        });
        setLastExpandedKey(collapseKey);
        return;
      }

      // Not currently collapsed and nothing pending — start collapsing:
      // stage it in pendingCollapseIds now (branch stays mounted, plays the
      // reverse draw-out sweep), commit to collapsedIds only once the
      // animation has had time to finish.
      setLastExpandedKey(undefined);
      setPendingCollapseIds((prev) => {
        const next = new Set(prev);
        next.add(collapseKey);
        return next;
      });
      const timeout = setTimeout(() => {
        timeoutsRef.current.delete(collapseKey);
        setPendingCollapseIds((prev) => {
          if (!prev.has(collapseKey)) return prev;
          const next = new Set(prev);
          next.delete(collapseKey);
          return next;
        });
        setCollapsedIds((prev) => {
          const next = new Set(prev);
          next.add(collapseKey);
          return next;
        });
      }, COLLAPSE_ANIMATION_MS);
      timeoutsRef.current.set(collapseKey, timeout);
    },
    [collapsedIds],
  );

  const isCollapsed = useCallback(
    (collapseKey: string) =>
      collapsedIds.has(collapseKey) || pendingCollapseIds.has(collapseKey),
    [collapsedIds, pendingCollapseIds],
  );

  return {
    collapsedIds,
    pendingCollapseIds,
    lastExpandedKey,
    isCollapsed,
    toggleCollapse,
  };
}
