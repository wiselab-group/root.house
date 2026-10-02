/** A fragment's center in the stage, in cqw of its width, and its tilt in
 *  degrees while scattered. */
type Point = { x: number; y: number; r: number };

export type StoryFragment = {
  /** Key into `landing.problem.sources.*` (label + text). */
  id: "chat" | "phone" | "album" | "document" | "grandma" | "uncle" | "notes";
  /** paper = something written or printed, photo = a print with a picture,
   *  screen = a message on a phone. */
  look: "paper" | "photo" | "screen";
  desktop: Point;
  mobile: Point;
};

/**
 * Where a family's story actually lives before Root house — scattered
 * around the stage, all gathering into the middle. Desktop stage is
 * 100 × 62.5 cqw (16:10), mobile 100 × 120.
 */
export const STORY_FRAGMENTS: readonly StoryFragment[] = [
  {
    id: "chat",
    look: "screen",
    desktop: { x: 13, y: 9, r: -6 },
    mobile: { x: 26, y: 14, r: -5 },
  },
  {
    id: "album",
    look: "photo",
    desktop: { x: 38, y: 11, r: 4 },
    mobile: { x: 74, y: 25, r: 4 },
  },
  {
    id: "grandma",
    look: "paper",
    desktop: { x: 64, y: 9, r: -3 },
    mobile: { x: 25, y: 45, r: 3 },
  },
  {
    id: "document",
    look: "paper",
    desktop: { x: 87, y: 20, r: 6 },
    mobile: { x: 76, y: 60, r: -4 },
  },
  {
    id: "phone",
    look: "screen",
    desktop: { x: 14, y: 40, r: 5 },
    mobile: { x: 26, y: 76, r: 5 },
  },
  {
    id: "notes",
    look: "paper",
    desktop: { x: 42, y: 53, r: -4 },
    mobile: { x: 74, y: 92, r: -3 },
  },
  {
    id: "uncle",
    look: "paper",
    desktop: { x: 84, y: 48, r: -5 },
    mobile: { x: 34, y: 107, r: 2 },
  },
];
