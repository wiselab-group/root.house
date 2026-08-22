/**
 * Shared slug primitives — transliteration, format rules, and collision
 * resolution used by both domain/family/slug.ts (globally-unique family
 * handles) and domain/person/slug.ts (per-family-unique person handles).
 * Pure functions only — no DB access, per CLAUDE.md domain rules.
 */

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

export function transliterate(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("");
}

/** Slug format enforced everywhere a slug is accepted: lowercase ASCII
 *  letters/digits separated by single hyphens, 2-64 chars, no leading/
 *  trailing hyphen. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_MIN_LENGTH = 2;
export const SLUG_MAX_LENGTH = 64;

/** Converts an arbitrary string into a candidate slug — not guaranteed
 *  unique, caller must check/resolve collisions (see ensureUniqueSlug).
 *  `fallback` is returned as-is (assumed already-valid) when the input has
 *  no usable characters at all (e.g. a name that's only punctuation). */
export function slugifyBase(input: string, fallback: string): string {
  const slug = transliterate(input)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");

  return slug.length >= SLUG_MIN_LENGTH ? slug : fallback;
}

export function isValidSlugFormat(slug: string, reserved: ReadonlySet<string>): boolean {
  return (
    slug.length >= SLUG_MIN_LENGTH &&
    slug.length <= SLUG_MAX_LENGTH &&
    SLUG_PATTERN.test(slug) &&
    !reserved.has(slug)
  );
}

/** Appends -2, -3, ... until `isTaken` reports false. `isTaken` is injected
 *  (not a DB call here) so this stays unit-testable without a live database. */
export async function ensureUniqueSlug(
  baseSlug: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  let candidate = baseSlug;
  let suffix = 2;

  while (await isTaken(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
