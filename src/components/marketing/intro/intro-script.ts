/**
 * Decides, before first paint, whether this visit gets the landing intro —
 * only on the very first visit, never with reduced motion, never without
 * JS. Inlined as a blocking <script> ahead of the overlay (page.tsx), so a
 * return visit never flashes the overlay: marketing.css only shows it under
 * html[data-intro="play"], which this is the only thing that sets.
 * `next/script`'s beforeInteractive would do the same but is root-layout-
 * only, i.e. it would run on every app page too.
 */
const INTRO_STORAGE_KEY = "root-house:landing-intro-seen";

export const INTRO_SCRIPT = `(function(){try{var k=${JSON.stringify(INTRO_STORAGE_KEY)};if(localStorage.getItem(k)||matchMedia("(prefers-reduced-motion: reduce)").matches)return;localStorage.setItem(k,"1");document.documentElement.setAttribute("data-intro","play")}catch(e){}})();`;
