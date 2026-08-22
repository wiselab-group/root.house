/**
 * Family slug — a human-readable, URL-safe, globally-unique handle
 * (`/families/kupczyk`) generated from the family's (often Cyrillic) name.
 * Pure functions only — no DB access, per CLAUDE.md domain rules; uniqueness
 * enforcement lives in family.service.ts, format validation in
 * lib/validation/family.ts.
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

function transliterate(input: string): string {
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

/** Reserved path segments the slug must never collide with — kept in sync
 *  by hand with src/app's route segments under /families/ (small, stable
 *  list; see docs/architecture.md § Family slugs). "new" is the one that
 *  actually matters in practice (/families/new is a real static route
 *  sitting next to the [slug] dynamic segment); the rest are defensive. */
export const RESERVED_SLUGS = new Set([
  "api",
  "login",
  "register",
  "families",
  "family",
  "new",
  "_next",
  "favicon.ico",
]);

/** Converts an arbitrary family name into a candidate slug — not guaranteed
 *  unique, caller must check/resolve collisions (see ensureUniqueSlug). */
export function slugify(name: string): string {
  const slug = transliterate(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");

  return slug.length >= SLUG_MIN_LENGTH ? slug : "family";
}

export function isValidSlugFormat(slug: string): boolean {
  return (
    slug.length >= SLUG_MIN_LENGTH &&
    slug.length <= SLUG_MAX_LENGTH &&
    SLUG_PATTERN.test(slug) &&
    !RESERVED_SLUGS.has(slug)
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
