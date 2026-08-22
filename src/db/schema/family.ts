import { pgTable, text, timestamp, uuid, uniqueIndex, index, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const familyRoleEnum = pgEnum("family_role", ["owner", "editor", "viewer"]);
export const planTierEnum = pgEnum("plan_tier", ["free"]); // extended later (premium, lifetime, ...)

/**
 * Family — the core container of a genealogy archive. Persons/Events/Media/etc.
 * all belong to a Family, never directly to a User — this is what makes
 * multi-user collaboration (inviting relatives) possible without a data migration.
 */
export const families = pgTable(
  "families",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    // Human-readable, globally-unique, URL-safe handle (see domain/family/slug.ts)
    // — lets a family be reached at /families/[slug] instead of a raw UUID.
    // Backfilled for pre-existing rows in migration 0002.
    slug: text("slug").notNull(),
    description: text("description"),
    // Reserved for future billing — Family is the billing unit (one subscription
    // covers the whole family), not the User. Not enforced/used anywhere yet.
    planTier: planTierEnum("plan_tier").notNull().default("free"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("families_slug_unique").on(table.slug)],
);

/**
 * FamilyMember — join table between User and Family with a role. This is the
 * ONLY place authorization roles live; requireFamilyAccess() reads from here.
 */
export const familyMembers = pgTable(
  "family_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: familyRoleEnum("role").notNull().default("viewer"),
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("family_members_family_user_unique").on(table.familyId, table.userId),
    index("family_members_user_idx").on(table.userId),
    index("family_members_family_idx").on(table.familyId),
  ],
);
