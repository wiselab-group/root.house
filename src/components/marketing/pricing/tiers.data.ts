/**
 * The plans as proposed for launch (user's pricing notes, 2026-10-02 —
 * prices and limits to be revisited). Billing doesn't exist yet
 * (Family.planTier is schema-only), so every plan's button starts a free
 * archive; `soon` marks what Root house can't do yet, so the page never
 * sells it as shipped.
 */
export type TierId = "free" | "family" | "pro";

export type TierFeature = {
  /** Key into `landing.pricing.features.*`. */
  key:
    | "peopleUnlimited"
    | "archives3"
    | "storage500"
    | "stories10"
    | "members2"
    | "basics"
    | "archives10"
    | "storage20"
    | "storiesUnlimited"
    | "voice"
    | "members10"
    | "successor"
    | "familyBook"
    | "archivesUnlimited"
    | "storage100"
    | "members25"
    | "migration"
    | "domain";
  soon?: boolean;
};

export type Tier = {
  id: TierId;
  /** The plan whose features this one includes on top of its own list. */
  includes?: TierId;
  recommended?: boolean;
  features: readonly TierFeature[];
};

export const TIERS: readonly Tier[] = [
  {
    id: "free",
    features: [
      { key: "peopleUnlimited" },
      { key: "archives3" },
      { key: "storage500" },
      { key: "stories10" },
      { key: "members2" },
      { key: "basics" },
    ],
  },
  {
    id: "family",
    includes: "free",
    recommended: true,
    features: [
      { key: "archives10" },
      { key: "storage20" },
      { key: "storiesUnlimited" },
      { key: "voice" },
      { key: "members10" },
      { key: "successor", soon: true },
      { key: "familyBook", soon: true },
    ],
  },
  {
    id: "pro",
    includes: "family",
    features: [
      { key: "archivesUnlimited" },
      { key: "storage100" },
      { key: "members25" },
      { key: "migration", soon: true },
      { key: "domain", soon: true },
    ],
  },
];
