"use client";

import { useSyncExternalStore } from "react";
import { INTRO_SCRIPT } from "./intro-script";

const subscribe = () => () => {};

/**
 * The blocking intro <script> only has a job on a real document load — it
 * must run before first paint, which only server HTML can do. Reaching the
 * landing by client navigation (e.g. right after signing out) would make
 * React create the <script> in the browser, where it never executes and
 * React warns about it. The server snapshot (`true`) renders it into the
 * HTML and keeps hydration matching; any client-only render gets `false`
 * and renders nothing — the intro is first-visit-only anyway.
 */
export function IntroScriptTag() {
  const fromServerHtml = useSyncExternalStore(
    subscribe,
    () => false,
    () => true,
  );
  if (!fromServerHtml) return null;
  return <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />;
}
