"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MapMoment, TimelineRange } from "@/domain/place/map-snapshot";

/** About 13 seconds for a century — long enough to follow a move. */
const YEARS_PER_SECOND = 8;
/** Reduced motion: no sweep, the map steps a decade at a time. */
const STEP_YEARS = 10;
const STEP_SECONDS = 1.4;
/** A beat holds this long, so its caption can be read before moving on. */
const HOLD_SECONDS = 1.2;

/**
 * Plays the family's history across the timeline on requestAnimationFrame
 * (never timers): a continuous year for a smooth route draw-in, holding a
 * moment on each beat (`holds`, storyHoldYears) — or decade steps when the
 * user asked for reduced motion. Stops by itself at today.
 */
export function usePlayback(
  range: TimelineRange | null,
  holds: readonly number[],
  moment: MapMoment,
  setMoment: (moment: MapMoment) => void,
  playing: boolean,
  setPlaying: (playing: boolean) => void,
  reducedMotion: boolean,
) {
  const startRef = useRef(0);

  useEffect(() => {
    if (!playing || !range) return;
    let year = startRef.current;
    let last = performance.now();
    let held = 0;
    let holding = 0;
    let nextHold = holds.findIndex((h) => h >= year);
    if (nextHold < 0) nextHold = holds.length;
    let frame = requestAnimationFrame(function tick(now) {
      const dt = (now - last) / 1000;
      last = now;
      if (reducedMotion) {
        held += dt;
        if (held >= STEP_SECONDS) {
          held = 0;
          year += STEP_YEARS;
        }
      } else if (holding > 0) {
        holding -= dt;
        frame = requestAnimationFrame(tick);
        return;
      } else {
        year += dt * YEARS_PER_SECOND;
        if (nextHold < holds.length && year >= holds[nextHold]) {
          year = holds[nextHold];
          nextHold++;
          holding = HOLD_SECONDS;
        }
      }
      if (year >= range.to) {
        setMoment(range.to);
        setPlaying(false);
        return;
      }
      setMoment(reducedMotion ? Math.floor(year) : year);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, range, holds, reducedMotion, setMoment, setPlaying]);

  const play = useCallback(() => {
    if (!range) return;
    // From where the slider is — or from the start when at the end/«Всё время».
    startRef.current =
      typeof moment === "number" && moment < range.to ? moment : range.from;
    setMoment(startRef.current);
    setPlaying(true);
  }, [moment, range, setMoment, setPlaying]);

  const pause = useCallback(() => setPlaying(false), [setPlaying]);

  return { play, pause };
}
