/**
 * Family slug — a human-readable, URL-safe, globally-unique handle
 * (`/families/kupczyk`) generated from the family's (often Cyrillic) name.
 * Pure functions only — no DB access, per CLAUDE.md domain rules; uniqueness
 * enforcement lives in family.service.ts, format validation in
 * lib/validation/family.ts. Shared primitives (transliteration, format
 * rules, collision suffixing) live in domain/shared/slugify.ts — this file
 * only adds family-specific concerns (the reserved-route-segment list).
 */
import {
  isValidSlugFormat as isValidSlugFormatBase,
  slugifyBase,
} from "@/domain/shared/slugify";

export {
  SLUG_PATTERN,
  SLUG_MIN_LENGTH,
  SLUG_MAX_LENGTH,
  ensureUniqueSlug,
} from "@/domain/shared/slugify";

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
  return slugifyBase(name, "family");
}

export function isValidSlugFormat(slug: string): boolean {
  return isValidSlugFormatBase(slug, RESERVED_SLUGS);
}
