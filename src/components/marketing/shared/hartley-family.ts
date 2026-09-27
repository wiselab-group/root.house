/**
 * The one fictional family every landing illustration draws from, so the
 * hero, the memory box and the feature panels all tell the same story.
 * Illustration only — not product data, never persisted.
 */
export type DemoPersonId =
  "ivan" | "vera" | "paul" | "margaret" | "david" | "owen" | "lily";

export type DemoPerson = {
  id: DemoPersonId;
  name: string;
  years: string;
};

export const HARTLEY_FAMILY: Record<DemoPersonId, DemoPerson> = {
  ivan: { id: "ivan", name: "Ivan Hartley", years: "1928–1999" },
  vera: { id: "vera", name: "Vera Hartley", years: "1931–2014" },
  paul: { id: "paul", name: "Paul Hartley", years: "b. 1955" },
  margaret: { id: "margaret", name: "Margaret Lind", years: "b. 1957" },
  david: { id: "david", name: "David Lind", years: "b. 1956" },
  owen: { id: "owen", name: "You", years: "b. 1989" },
  lily: { id: "lily", name: "Lily Lind", years: "b. 1993" },
};
