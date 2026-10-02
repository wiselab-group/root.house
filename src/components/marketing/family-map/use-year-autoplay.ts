import { useEffect, useState } from "react";
import { smoothstep } from "@/components/marketing/shared/scroll-math";

const PLAY_MS = 9000;

/**
 * Plays the map's years from `from` to `to` once, the first time `start`
 * turns true — on requestAnimationFrame, eased so it lingers at the ends.
 * Returns null until it starts. Pass `start: false` to stop it (e.g. as
 * soon as the visitor takes the slider).
 */
export function useYearAutoplay(start: boolean, from: number, to: number) {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    if (!start) return;
    let frame = 0;
    let startedAt: number | null = null;
    function step(now: number) {
      startedAt ??= now;
      const t = Math.min((now - startedAt) / PLAY_MS, 1);
      setYear(Math.round(from + (to - from) * smoothstep(t)));
      if (t < 1) frame = requestAnimationFrame(step);
    }
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [start, from, to]);

  return year;
}
