"use client";

import { useCallback, useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { useCoarsePointer } from "@/hooks/use-coarse-pointer";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const CAMERA_MS = 500;

/**
 * Viewport moves for the Relationship Trace panel. Must render inside
 * <ReactFlow> (TreeCanvas's `overlay` slot) for useReactFlow to resolve.
 *
 * `frame` fits the whole traced path, padded away from whichever edge the
 * panel covers: the left 360px on desktop (floating panel), the lower half
 * on touch (bottom sheet) — and clear of the bottom button bar, so no
 * traced card ends up hidden under either.
 */
export function useKinshipCamera() {
  const { getNode, getZoom, setCenter, fitView } = useReactFlow();
  const reducedMotion = useReducedMotion();
  const isCoarse = useCoarsePointer();
  const duration = reducedMotion ? undefined : CAMERA_MS;

  const panTo = useCallback(
    (personId: string) => {
      const node = getNode(personId);
      if (!node) return;
      const width = node.measured?.width ?? node.width ?? 0;
      const height = node.measured?.height ?? node.height ?? 0;
      void setCenter(
        node.position.x + width / 2,
        node.position.y + height / 2,
        { zoom: Math.max(getZoom(), 0.8), duration },
      );
    },
    [getNode, getZoom, setCenter, duration],
  );

  const frame = useCallback(
    (personIds: string[]) => {
      if (personIds.length === 0) return;
      void fitView({
        nodes: personIds.map((id) => ({ id })),
        maxZoom: 1.15,
        duration,
        padding: isCoarse
          ? { top: "12%", x: "8%", bottom: "55%" }
          : { left: "360px", right: "6%", top: "8%", bottom: "120px" },
      });
    },
    [fitView, isCoarse, duration],
  );

  return { panTo, frame };
}

/**
 * Frames the path once each time a NEW pair is completed — not on page load
 * with a pair already in the URL (the tree opens on its focus person, same
 * as always), and not on unrelated re-renders.
 */
export function useFramePathOnChange(
  pairKey: string | null,
  personIds: string[],
  frame: (personIds: string[]) => void,
) {
  const lastKey = useRef(pairKey);
  useEffect(() => {
    if (pairKey === lastKey.current) return;
    lastKey.current = pairKey;
    if (pairKey) frame(personIds);
    // personIds is derived from pairKey; keying on it too would re-frame
    // every time its array identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairKey, frame]);
}
