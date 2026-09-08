import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Shared privacy enum used by Person/Event/Media/Story. Default is always
 * 'family' at the application layer (never 'public') — see person/event/media/
 * story table definitions for the per-column default.
 *
 * Deliberately NOT added to Relationship or Album/Place tables: Relationship
 * rows carry no independent sensitive content of their own (just an edge
 * between two Persons, each already privacy-gated), and an Album/Place's
 * sensitivity flows from the Events/Media/Persons that reference it rather
 * than the container row itself — see domain/family/permissions.ts. This is
 * an intentional scope boundary, not an oversight.
 */
export const privacyLevelEnum = pgEnum("privacy_level", [
  "private",
  "family",
  "public",
]);

/** Shared type for the three privacy levels — repositories should import this
 *  instead of re-inlining the "private"|"family"|"public" union. */
export type PrivacyLevel = "private" | "family" | "public";
