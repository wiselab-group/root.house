import type { DemoPersonId } from "@/components/marketing/shared/hartley-family";

/** A position in the stage, in cqw of its width: x = card center, y = card
 *  top, r = rotation in degrees (scattered state only). */
type Point = { x: number; y: number; r?: number };

export type MemoryFragment = {
  person: DemoPersonId;
  kind: "photo" | "note";
  /** Handwritten caption (photo) or the note's text. */
  text: string;
  from: { desktop: Point; mobile: Point };
  to: { desktop: Point; mobile: Point };
};

/**
 * Seven loose memories — photos and notes as they come out of a box — and
 * the tree slot each one lands in. Desktop stage is 100 × 62.5 cqw (16:10),
 * mobile 100 × 100. Slots are laid out like the real tree: couples side by
 * side, parents centred over their children, one card width apart.
 */
export const MEMORY_FRAGMENTS: readonly MemoryFragment[] = [
  {
    person: "ivan",
    kind: "photo",
    text: "Ivan, 1950",
    from: { desktop: { x: 14, y: 5, r: -8 }, mobile: { x: 18, y: 6, r: -8 } },
    to: { desktop: { x: 30, y: 3 }, mobile: { x: 20, y: 2 } },
  },
  {
    person: "vera",
    kind: "note",
    text: "Grandma Vera — Riga, '52",
    from: { desktop: { x: 86, y: 4, r: 7 }, mobile: { x: 80, y: 4, r: 7 } },
    to: { desktop: { x: 50, y: 3 }, mobile: { x: 48, y: 2 } },
  },
  {
    person: "paul",
    kind: "note",
    text: "Dear Paul, the lake froze early this year…",
    from: { desktop: { x: 10, y: 33, r: 5 }, mobile: { x: 14, y: 42, r: 6 } },
    to: { desktop: { x: 30, y: 24 }, mobile: { x: 18, y: 36 } },
  },
  {
    person: "margaret",
    kind: "photo",
    text: "Maggie, summer '58",
    from: { desktop: { x: 57, y: 17, r: -5 }, mobile: { x: 54, y: 30, r: -5 } },
    to: { desktop: { x: 50, y: 24 }, mobile: { x: 50, y: 36 } },
  },
  {
    person: "david",
    kind: "note",
    text: "12 · VI · 1986 — registry office",
    from: { desktop: { x: 88, y: 33, r: -9 }, mobile: { x: 84, y: 46, r: -9 } },
    to: { desktop: { x: 70, y: 24 }, mobile: { x: 82, y: 36 } },
  },
  {
    person: "owen",
    kind: "photo",
    text: "Owen, 1990",
    from: { desktop: { x: 32, y: 40, r: 8 }, mobile: { x: 30, y: 70, r: 8 } },
    to: { desktop: { x: 50, y: 45 }, mobile: { x: 52, y: 70 } },
  },
  {
    person: "lily",
    kind: "photo",
    text: "Lily — first day of school",
    from: { desktop: { x: 72, y: 42, r: -6 }, mobile: { x: 72, y: 72, r: -6 } },
    to: { desktop: { x: 70, y: 45 }, mobile: { x: 80, y: 70 } },
  },
];

/** Genogram connectors between the slots above: partnership lines at frame
 *  height, union trunks down to the children's frame tops. */
export const MEMORY_CONNECTORS = {
  desktop: {
    viewBox: "0 0 100 62.5",
    paths: [
      "M34.2 7.2H45.8",
      "M40 7.2V17M30 24V17H50V24",
      "M54.2 28.2H65.8",
      "M60 28.2V38M50 45V38H70V45",
    ],
  },
  mobile: {
    viewBox: "0 0 100 100",
    paths: [
      "M29.1 11.1H38.9",
      "M34 11.1V29M18 36V29H50V36",
      "M59.1 45.1H72.9",
      "M66 45.1V63M52 70V63H80V70",
    ],
  },
} as const;
