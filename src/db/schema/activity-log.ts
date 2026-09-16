import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { families } from "./family";
import { users } from "./auth";

export const activityActionEnum = pgEnum("activity_action", [
  "create",
  "update",
  "delete",
]);

export const activityEntityTypeEnum = pgEnum("activity_entity_type", [
  "person",
  "relationship_parent_child",
  "relationship_partnership",
  "event",
  "media",
  "story",
  "album",
]);

/**
 * ActivityLog — an append-only audit trail of who created/changed/deleted
 * what, for the family owner's "История действий" settings view. Facts
 * only, no diff/payload column (owner asked for "what happened", not "what
 * changed") — entityLabel is captured AT THE TIME of the action so a delete
 * entry still reads correctly after the referenced row is gone.
 */
export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: activityActionEnum("action").notNull(),
    entityType: activityEntityTypeEnum("entity_type").notNull(),
    // Deliberately NOT a FK — the referenced row is frequently gone by the
    // time this entry is read (that's the point of a delete log entry), and
    // a single shared column can't FK to seven different tables anyway.
    entityId: uuid("entity_id").notNull(),
    entityLabel: text("entity_label").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("activity_log_family_created_idx").on(
      table.familyId,
      table.createdAt,
    ),
  ],
);
