import type { DemoPersonId } from "@/components/marketing/shared/hartley-family";
import type { Camera } from "@/components/marketing/shared/scroll-math";

export const GROWTH_STEPS = [
  "you",
  "parents",
  "grandparents",
  "relatives",
  "children",
  "memories",
] as const;

/**
 * The tree as it grows, in % of a square stage. Cards are 15 wide; their
 * square frame is 11.4, so a frame's center sits 5.7 below the card top.
 * `step` = the GROWTH_STEPS index at which the person joins.
 */
export const GROWTH_PEOPLE: readonly {
  id: DemoPersonId;
  x: number;
  y: number;
  step: number;
}[] = [
  { id: "owen", x: 50, y: 52, step: 0 },
  { id: "margaret", x: 50, y: 27, step: 1 },
  { id: "david", x: 68, y: 27, step: 1 },
  { id: "ivan", x: 32, y: 2, step: 2 },
  { id: "vera", x: 50, y: 2, step: 2 },
  { id: "paul", x: 26, y: 27, step: 3 },
  { id: "lily", x: 68, y: 52, step: 3 },
  { id: "kid", x: 50, y: 77, step: 4 },
];

export const GROWTH_LINES: readonly { d: string; step: number }[] = [
  { d: "M55.7 32.7H62.3", step: 1 },
  { d: "M59 32.7V46H50V52", step: 1 },
  { d: "M37.7 7.7H44.3", step: 2 },
  { d: "M41 7.7V21H50V27", step: 2 },
  { d: "M41 21H26V27", step: 3 },
  { d: "M59 46H68V52", step: 3 },
  { d: "M50 71V77", step: 4 },
];

/** What's remembered about whom, pinned beside their card in the last
 *  step. `side` = which side of the card the chip sits on. */
export const GROWTH_BADGES: readonly {
  /** Also the key into `landing.growth.badges.*`. */
  id: Exclude<DemoPersonId, "owen" | "margaret">;
  icon: "story" | "photo" | "event" | "place" | "voice";
  side: "left" | "right";
}[] = [
  { id: "vera", icon: "story", side: "right" },
  { id: "ivan", icon: "photo", side: "left" },
  { id: "david", icon: "event", side: "right" },
  { id: "paul", icon: "place", side: "left" },
  { id: "lily", icon: "place", side: "right" },
  { id: "kid", icon: "voice", side: "right" },
];

/** Where the camera looks at each step — close on one person at first,
 *  pulling back as the family grows (x/y in % of the stage). */
export const GROWTH_CAMERAS: readonly Camera[] = [
  { x: 50, y: 60, scale: 2.3 },
  { x: 58, y: 47, scale: 1.65 },
  { x: 50, y: 36, scale: 1.25 },
  { x: 48, y: 44, scale: 1.08 },
  { x: 50, y: 48, scale: 1 },
  { x: 50, y: 48, scale: 1 },
];
