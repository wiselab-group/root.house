"use client";

import { useEffect } from "react";

/**
 * Scrolls to the element the URL's #hash names once the calling component
 * has mounted. A client-side <Link> to «/…/edit#death» lands before the
 * form below a loading state exists, so Next's own hash scroll finds
 * nothing to scroll to — this runs after the element is actually there.
 */
export function useScrollToHash() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, []);
}
