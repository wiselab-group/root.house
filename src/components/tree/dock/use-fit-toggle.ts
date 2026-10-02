"use client";

import { useState } from "react";
import {
  useOnViewportChange,
  useReactFlow,
  type Viewport,
} from "@xyflow/react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface FitState {
  /** The view the user had before "Показать всё дерево". */
  previous: Viewport;
  /** Where the fit landed; null while its animation is still running. */
  fitted: Viewport | null;
}

const EPSILON = 0.5;

function sameViewport(a: Viewport, b: Viewport) {
  return (
    Math.abs(a.x - b.x) < EPSILON &&
    Math.abs(a.y - b.y) < EPSILON &&
    Math.abs(a.zoom - b.zoom) < 0.001
  );
}

/**
 * "Показать всё дерево" as a two-way toggle (user request 2026-10-02):
 * after fitting the whole tree the same dock button turns into "back to
 * the previous view" and restores the exact pan/zoom the user had. Any
 * other viewport move after the fit (a pan, a zoom, a focus change's
 * setCenter) makes that saved view stale, so the button falls back to
 * "show all".
 */
export function useFitToggle() {
  const { fitView, getViewport, setViewport } = useReactFlow();
  const reducedMotion = useReducedMotion();
  const [state, setState] = useState<FitState | null>(null);
  const duration = reducedMotion ? undefined : 300;

  useOnViewportChange({
    onEnd: (viewport) => {
      if (state?.fitted && !sameViewport(viewport, state.fitted))
        setState(null);
    },
  });

  const toggle = () => {
    if (state) {
      setState(null);
      void setViewport(state.previous, { duration });
      return;
    }
    const previous = getViewport();
    setState({ previous, fitted: null });
    void fitView({ duration }).then(() => {
      const fitted = getViewport();
      setState((s) =>
        s && s.previous === previous ? { previous, fitted } : s,
      );
    });
  };

  return { canRestore: state !== null, toggle };
}
