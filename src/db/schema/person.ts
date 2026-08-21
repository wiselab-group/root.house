import { pgTable, text, timestamp, uuid, smallint, boolean, index, pgEnum } from "drizzle-orm/pg-core";
import { families } from "./family";
import { places } from "./place";
import { users } from "./auth";
import { privacyLevelEnum } from "./privacy";

export const genderEnum = pgEnum("gender", ["male", "female", "unknown", "other"]);

/**
 * Person — belongs to a Family, never directly to a User (so inviting an
 * editor into the Family gives them the whole graph, no data migration needed).
 *
 * Notes on deliberately-excluded fields:
 * - occupation/education are NOT columns here — modeled as Event rows
 *   (type: 'occupation' | 'education') so career/education history isn't
 *   flattened into a single string.
 * - "unknown parent" / "a son existed but his name is unknown" is NOT a special
 *   case in Relationship — it's an ordinary Person row with isPlaceholder=true
 *   and every optional field null. This keeps ancestors/descendants queries
 *   free of null-checks for "does this node fully exist".
 *
 * `photoMediaId` intentionally has NO foreign-key constraint at the schema
 * level: person.ts and media.ts would otherwise form a circular module
 * import (Media rows reference Person via media_person, Person references
 * Media for its profile photo). The relationship is enforced at the
 * application layer (person.service.ts validates the referenced Media exists
 * and belongs to the same family before assigning it).
 */
export const persons = pgTable(
  "persons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),

    firstName: text("first_name"),
    lastName: text("last_name"),
    middleName: text("middle_name"),
    maidenName: text("maiden_name"),
    nickname: text("nickname"),

    gender: genderEnum("gender").notNull().default("unknown"),
    isPlaceholder: boolean("is_placeholder").notNull().default(false),
    isLiving: boolean("is_living").notNull().default(true),

    birthDateYear: smallint("birth_date_year"),
    birthDateMonth: smallint("birth_date_month"),
    birthDateDay: smallint("birth_date_day"),
    birthDatePrecision: text("birth_date_precision"),
    birthDateApproximate: boolean("birth_date_approximate"),

    deathDateYear: smallint("death_date_year"),
    deathDateMonth: smallint("death_date_month"),
    deathDateDay: smallint("death_date_day"),
    deathDatePrecision: text("death_date_precision"),
    deathDateApproximate: boolean("death_date_approximate"),

    birthPlaceId: uuid("birth_place_id").references(() => places.id, { onDelete: "set null" }),
    deathPlaceId: uuid("death_place_id").references(() => places.id, { onDelete: "set null" }),

    description: text("description"),
    religion: text("religion"),
    nationality: text("nationality"),

    photoMediaId: uuid("photo_media_id"), // see note above — no FK constraint, app-enforced

    privacyLevel: privacyLevelEnum("privacy_level").notNull().default("family"),

    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("persons_family_idx").on(table.familyId),
    index("persons_family_name_idx").on(table.familyId, table.lastName, table.firstName),
  ],
);

// Note: the pg_trgm-backed fuzzy-search index on (first_name, last_name, maiden_name)
// is added via a raw SQL migration (Drizzle has no first-class trigram-index
// builder) — see docs/architecture.md § Search.
