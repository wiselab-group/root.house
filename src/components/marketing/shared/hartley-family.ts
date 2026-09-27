/**
 * The one fictional family every landing illustration draws from, so the
 * hero, the memory box and the feature panels all tell the same story.
 * Illustration only — not product data, never persisted. Names and years
 * live in messages (`landing.family.*`) — see use-demo-family.ts.
 */
export type DemoPersonId =
  "ivan" | "vera" | "paul" | "margaret" | "david" | "owen" | "lily";

export type DemoPerson = {
  id: DemoPersonId;
  name: string;
  years: string;
};

export const DEMO_PERSON_IDS: readonly DemoPersonId[] = [
  "ivan",
  "vera",
  "paul",
  "margaret",
  "david",
  "owen",
  "lily",
];
