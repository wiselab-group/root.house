import {
  personCountLabel,
  photoCountLabel,
  placeCountLabel,
} from "@/domain/shared/pluralize-ru";

/**
 * "Family at a glance" line on Family Home — plain text, not a stat-card
 * grid (per docs/PRODUCT-REFACTOR.md §L: avoid the "cards everywhere"
 * dashboard tell). Only counts already cheaply available from data the page
 * fetches anyway (person/place/visible-photo counts) — no "generations"
 * figure, since that would require running the tree layout engine from a
 * focus person just to produce a homepage stat, and the brief explicitly
 * forbids fabricating statistics (§46). A count of 0 is simply omitted
 * rather than shown as "0 people", matching the same "earn your count"
 * convention as ProfileSection's own `count` prop.
 */
export function FamilyHomeStats({
  personCount,
  placeCount,
  photoCount,
}: {
  personCount: number;
  placeCount: number;
  photoCount: number;
}) {
  const parts = [
    personCount > 0 ? personCountLabel(personCount) : null,
    placeCount > 0 ? placeCountLabel(placeCount) : null,
    photoCount > 0 ? photoCountLabel(photoCount) : null,
  ].filter((part): part is string => part !== null);

  if (parts.length === 0) return null;

  return <p className="text-sm text-muted-foreground">{parts.join(" · ")}</p>;
}
