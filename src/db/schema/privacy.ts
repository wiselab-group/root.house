import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Shared privacy enum used by Person/Event/Media/Story. Default is always
 * 'family' at the application layer (never 'public') — see person/event/media/
 * story table definitions for the per-column default.
 */
export const privacyLevelEnum = pgEnum("privacy_level", [
  "private",
  "family",
  "public",
]);
