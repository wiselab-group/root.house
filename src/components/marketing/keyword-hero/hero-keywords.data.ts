import type { DemoPersonId } from "@/components/marketing/shared/hartley-family";

export type HeroKeyword = {
  /** Completes "Create the living story of …". */
  text: string;
  /** Cards in the hero tree lit up (terracotta, "what you're looking at")
   *  while this keyword is in focus. Empty = the whole family, all at rest. */
  highlight: readonly DemoPersonId[];
  /** Small glass chip next to the lit cards: the memory itself. */
  note: string;
  /** Chip position in the vignette, % of its box. */
  noteAt: { x: number; y: number };
};

export const HERO_KEYWORDS: readonly HeroKeyword[] = [
  {
    text: "grandma's letters",
    highlight: ["vera"],
    note: "14 letters · 1952",
    noteAt: { x: 70, y: 34 },
  },
  {
    text: "the first photo",
    highlight: ["margaret"],
    note: "Photo · summer 1958",
    noteAt: { x: 30, y: 72 },
  },
  {
    text: "the move in 1956",
    highlight: ["ivan", "vera"],
    note: "Riga → Tallinn · 1956",
    noteAt: { x: 50, y: 34 },
  },
  {
    text: "mom's wedding",
    highlight: ["margaret", "david"],
    note: "Wedding · 12 June 1986",
    noteAt: { x: 50, y: 72 },
  },
  {
    text: "your family",
    highlight: [],
    note: "5 people · 3 generations",
    noteAt: { x: 50, y: 34 },
  },
];
