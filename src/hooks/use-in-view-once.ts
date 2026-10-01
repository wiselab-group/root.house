"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Flips to true the first time the element is at least `threshold` on
 * screen, and stays true — for one-time entrance animations that must wait
 * until they're actually seen (e.g. PersonLifeline, which on phones sits in
 * a tab panel that's display:none until its tab is picked; an observer only
 * reports it once it's shown).
 */
export function useInViewOnce<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setInView(true);
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, threshold]);

  return { ref, inView };
}
