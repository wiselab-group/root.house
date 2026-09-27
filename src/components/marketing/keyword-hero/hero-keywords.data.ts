import type { DemoPersonId } from "@/components/marketing/shared/hartley-family";

export type HeroKeyword = {
  /** Key into `landing.keywords.*` — `text` completes "Create the living
   *  story of …", `note` is the memory chip next to the lit cards. */
  id: "letters" | "photo" | "move" | "wedding" | "family";
  /** Cards in the hero tree lit up (terracotta, "what you're looking at")
   *  while this keyword is in focus. Empty = the whole family, all at rest. */
  highlight: readonly DemoPersonId[];
  /** Chip position in the vignette, % of its box. */
  noteAt: { x: number; y: number };
};

export const HERO_KEYWORDS: readonly HeroKeyword[] = [
  {
    id: "letters",
    highlight: ["vera"],
    noteAt: { x: 70, y: 34 },
  },
  {
    id: "photo",
    highlight: ["margaret"],
    noteAt: { x: 30, y: 72 },
  },
  {
    id: "move",
    highlight: ["ivan", "vera"],
    noteAt: { x: 50, y: 34 },
  },
  {
    id: "wedding",
    highlight: ["margaret", "david"],
    noteAt: { x: 50, y: 72 },
  },
  {
    id: "family",
    highlight: [],
    noteAt: { x: 50, y: 34 },
  },
];
