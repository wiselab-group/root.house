/**
 * Story slug — a human-readable handle unique WITHIN a family (not
 * globally, same pattern as domain/person/slug.ts) that lets a Story be
 * reached at /families/[familySlug]/stories/[slug] instead of a raw UUID.
 * Pure functions only — no DB access, per CLAUDE.md domain rules;
 * uniqueness enforcement (scoped by familyId) lives in story.service.ts.
 */
import {
  isValidSlugFormat as isValidSlugFormatBase,
  slugifyBase,
} from "@/domain/shared/slugify";

export {
  SLUG_MIN_LENGTH,
  SLUG_MAX_LENGTH,
  ensureUniqueSlug,
} from "@/domain/shared/slugify";

/** "new" is the one that matters — /families/[slug]/stories/new is a real
 *  static route sitting next to the [storySlug] dynamic segment, same
 *  reasoning as person/slug.ts's RESERVED_PERSON_SLUGS. */
export const RESERVED_STORY_SLUGS = new Set<string>(["new"]);

/**
 * Converts a Story's title into a candidate slug — not guaranteed unique
 * within the family, caller must check/resolve collisions (see
 * ensureUniqueSlug, scoped to familyId). `fallbackSeed` (the story's own
 * id) produces a short, deterministic, collision-free slug for the rare
 * case a title has no usable characters at all (e.g. all punctuation).
 */
export function slugifyStory(title: string, fallbackSeed: string): string {
  return slugifyBase(title, `story-${fallbackSeed.slice(0, 8)}`);
}

export function isValidStorySlugFormat(slug: string): boolean {
  return isValidSlugFormatBase(slug, RESERVED_STORY_SLUGS);
}
