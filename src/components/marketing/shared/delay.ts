import type { CSSProperties } from "react";

/** Entrance delay for a `data-reveal` element or a sequence step, in ms
 *  (marketing.css reads it as --d). Kept out of reveal.tsx so server
 *  components can call it — reveal.tsx is a client module. */
export function delay(ms: number): CSSProperties {
  return { "--d": `${ms}ms` } as CSSProperties;
}
