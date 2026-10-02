/**
 * The one fictional family every landing illustration draws from, so every
 * section of the landing follows the same family.
 * Illustration only — not product data, never persisted. Names and years
 * live in messages (`landing.family.*`) — see use-demo-family.ts.
 */
export type DemoPersonId =
  "ivan" | "vera" | "paul" | "margaret" | "david" | "owen" | "lily" | "kid";

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
  "kid",
];
