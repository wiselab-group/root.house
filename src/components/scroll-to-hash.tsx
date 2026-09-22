"use client";

import { useEffect } from "react";

/**
 * Scrolls to the element named by the current URL hash on mount — Next.js
 * App Router's client-side navigation (both a <Link> click and a full
 * page load that lands via next/navigation) does not reliably perform the
 * browser's native anchor scroll once React has hydrated, so an incoming
 * `#activity`-style deep link (e.g. Family Home's "Ещё" button under
 * Активность семьи) silently lands at the top of the page instead of at
 * the target section. Render this once, near the top of a page that may be
 * reached via a hash link from elsewhere — it does nothing when there's no
 * hash or no matching element.
 */
export function ScrollToHash() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const target = document.getElementById(hash.slice(1));
    target?.scrollIntoView({ block: "start" });
  }, []);

  return null;
}
