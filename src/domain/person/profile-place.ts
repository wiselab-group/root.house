/**
 * - "birth" — a living person's birthplace (residence unknown);
 * - "residence" — where a living person lives now (birthplace unknown);
 * - "home" — a living person who lives where they were born;
 * - "journey" — a living person's birthplace → current residence;
 * - "life" — the deceased's birth → death arc.
 */
export type ProfilePlace =
  | { kind: "birth" | "residence" | "home" | "life"; label: string }
  | { kind: "journey"; from: string; to: string };

/**
 * The place line shown next to the dates in the Person profile hero.
 *
 * A living person reads as a path still in progress — «📍 Минск → 🏠
 * Таллинн» — the archive is a *living* family story, so where they are now
 * matters as much as where they come from; the deceased read as a finished
 * arc, «Гродно → Минск» (a residence left over from before they were marked
 * deceased is ignored). Place names are never inflected into a sentence
 * («живёт в …», «родом из …») because arbitrary names can't be declined
 * reliably — the hero's icons carry the meaning instead.
 */
export function profilePlace({
  isLiving,
  birthPlaceName,
  deathPlaceName,
  residencePlaceName,
}: {
  isLiving: boolean;
  birthPlaceName: string | null;
  deathPlaceName: string | null;
  residencePlaceName: string | null;
}): ProfilePlace | null {
  if (!isLiving) {
    const arc = [birthPlaceName, deathPlaceName].filter(Boolean).join(" → ");
    return arc ? { kind: "life", label: arc } : null;
  }
  if (birthPlaceName && residencePlaceName) {
    return samePlaceName(birthPlaceName, residencePlaceName)
      ? { kind: "home", label: residencePlaceName }
      : { kind: "journey", from: birthPlaceName, to: residencePlaceName };
  }
  if (residencePlaceName) return { kind: "residence", label: residencePlaceName };
  if (birthPlaceName) return { kind: "birth", label: birthPlaceName };
  return null;
}

/** Compared by name, not id: a family can hold two Place rows for one city. */
function samePlaceName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase("ru") === b.trim().toLocaleLowerCase("ru");
}
