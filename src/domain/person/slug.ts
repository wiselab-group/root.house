/**
 * Person slug — a human-readable handle unique WITHIN a family (not
 * globally, unlike families.slug — see domain/family/slug.ts) that lets a
 * Person be reached at /families/[familySlug]/people/[slug] instead of a
 * raw UUID. Pure functions only — no DB access, per CLAUDE.md domain rules;
 * uniqueness enforcement (scoped by familyId) lives in person.service.ts.
 */
import { isValidSlugFormat as isValidSlugFormatBase, slugifyBase } from "@/domain/shared/slugify";

export { SLUG_MIN_LENGTH, SLUG_MAX_LENGTH, ensureUniqueSlug } from "@/domain/shared/slugify";

/** "new" is the one that matters — /families/[slug]/people/new is a real
 *  static route sitting next to the [personSlug] dynamic segment, same
 *  reasoning as family.slug.ts's RESERVED_SLUGS. */
export const RESERVED_PERSON_SLUGS = new Set<string>(["new"]);

export interface PersonSlugSource {
  firstName?: string | null;
  nickname?: string | null;
  isPlaceholder: boolean;
}

/**
 * Converts a Person's name into a candidate slug — not guaranteed unique
 * within the family, caller must check/resolve collisions (see
 * ensureUniqueSlug, scoped to familyId).
 *
 * Only the first name feeds the slug (not last name) — deliberately: a
 * short first-name-only slug ("alexander") is what the user asked for, and
 * genealogical records repeat surnames constantly (everyone in a family
 * tree often shares one), so surnames wouldn't meaningfully reduce
 * collisions anyway — the -2/-3 suffix already handles the rest.
 *
 * A person with no first name (nickname-only, or a fully-blank placeholder
 * — "unnamed son", isPlaceholder=true with every field null) has no
 * linguistic material to build a slug from at all; `fallbackSeed` (the
 * person's own id) is used to produce a short, deterministic, collision-free
 * slug for that case instead of guessing at a label.
 */
export function slugifyPerson(source: PersonSlugSource, fallbackSeed: string): string {
  const base = source.firstName || source.nickname;
  if (base) {
    return slugifyBase(base, `person-${fallbackSeed.slice(0, 8)}`);
  }
  return `person-${fallbackSeed.slice(0, 8)}`;
}

export function isValidPersonSlugFormat(slug: string): boolean {
  return isValidSlugFormatBase(slug, RESERVED_PERSON_SLUGS);
}
