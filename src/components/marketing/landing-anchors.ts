import { LayoutGridIcon, RouteIcon, TagIcon } from "lucide-react";

/** In-page sections the landing header links to — `id` is also the key in
 *  `landing.nav.*`, `href` the section's element id, `Icon` its glyph in
 *  the phone menu (as the app's own menu shows one per section). Rooted at
 *  `/` so the same header works from other marketing pages (/privacy). */
export const LANDING_ANCHORS = [
  { id: "how", href: "/#how-it-works", Icon: RouteIcon },
  { id: "features", href: "/#features", Icon: LayoutGridIcon },
  { id: "pricing", href: "/#pricing", Icon: TagIcon },
] as const;
