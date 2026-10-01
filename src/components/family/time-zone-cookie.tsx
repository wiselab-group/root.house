"use client";

import { useEffect } from "react";
import { TIME_ZONE_COOKIE } from "@/lib/day-period";

/**
 * Remembers the browser's time zone in a cookie so the server can greet in
 * the viewer's own time of day (lib/day-period.ts). Renders nothing; writes
 * only when the zone is missing or changed (travel, a new device).
 */
export function TimeZoneCookie({ current }: { current: string | null }) {
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone || zone === current) return;
    // IANA names are cookie-safe as they are («Europe/Tallinn»).
    document.cookie = `${TIME_ZONE_COOKIE}=${zone}; path=/; max-age=31536000; samesite=lax`;
  }, [current]);
  return null;
}
