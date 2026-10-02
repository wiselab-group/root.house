import type { DemoPersonId } from "@/components/marketing/shared/hartley-family";

/** Who adds what to the wedding, in order — the event card and the feed
 *  both read their timing from here so the two stay in step. `at` is ms
 *  after the block scrolls into view. */
export const TOGETHER_STEPS = [
  { who: "margaret", at: 500 },
  { who: "paul", at: 1700 },
  { who: "lily", at: 2900 },
  { who: "owen", at: 4100 },
] as const satisfies readonly { who: DemoPersonId; at: number }[];

export function stepAt(who: (typeof TOGETHER_STEPS)[number]["who"]): number {
  return TOGETHER_STEPS.find((step) => step.who === who)?.at ?? 0;
}
